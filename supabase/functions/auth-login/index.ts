import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password, type } = await req.json();

    if (!username || !password || !type) {
      return new Response(
        JSON.stringify({ error: 'Username, password und type sind erforderlich' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let tableName = '';
    if (type === 'admin') {
      tableName = 'admin_users';
    } else if (type === 'user') {
      tableName = 'users';
    } else {
      return new Response(
        JSON.stringify({ error: 'Ungültiger Login-Typ' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from(tableName)
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (userError) {
      console.error('Database error:', userError);
      return new Response(
        JSON.stringify({ error: 'Datenbankfehler' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Benutzername oder Passwort ungültig' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('User found in table:', tableName, 'with ID:', user.id);

    // For regular users, check if account is active
    if (type === 'user' && !user.is_active) {
      return new Response(
        JSON.stringify({ error: 'Benutzerkonto ist deaktiviert' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify password using Postgres function
    console.log('Verifying password for user:', username);
    
    let passwordMatch = false;
    try {
      const { data: cryptCheck, error: cryptError } = await supabase
        .rpc('verify_password', { 
          input_password: password, 
          stored_hash: user.password_hash 
        });
      
      if (cryptError) {
        console.error('Password verification error:', cryptError);
        return new Response(
          JSON.stringify({ error: 'Fehler bei der Passwortprüfung' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      passwordMatch = cryptCheck === true;
      console.log('Password match result:', passwordMatch);
    } catch (verifyError) {
      console.error('Verify password error:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Fehler bei der Passwortprüfung' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!passwordMatch) {
      console.log('Password verification failed for user:', username);
      return new Response(
        JSON.stringify({ error: 'Benutzername oder Passwort ungültig' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user role from user_roles table
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const userRole = roleData?.role || 'user';
    console.log(`User ${username} has role: ${userRole}`);

    // Generate JWT token with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: `${user.id}@internal.app`,
      options: {
        data: {
          user_id: user.id,
          username: user.username,
          role: userRole
        }
      }
    });

    if (authError || !authData) {
      console.error('Failed to generate auth token:', authError);
      return new Response(
        JSON.stringify({ error: 'Token-Generierung fehlgeschlagen' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract the JWT token from the generated link
    const url = new URL(authData.properties.action_link);
    const token = url.searchParams.get('token');
    
    if (!token) {
      console.error('No token found in generated link');
      return new Response(
        JSON.stringify({ error: 'Token-Generierung fehlgeschlagen' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Successfully generated JWT token for user: ${username}`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: userRole
        },
        session: {
          access_token: token,
          user: {
            id: user.id,
            email: `${user.id}@internal.app`,
            user_metadata: {
              username: user.username,
              role: userRole
            }
          }
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in auth-login function:', error);
    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
