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

    // Verify password using Postgres crypt function
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
        throw cryptError;
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

    // Return user data and simple session token
    const sessionToken = 'admin123'; // Simple token for authenticated users
    
    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: user.id,
          username: user.username
        },
        session: {
          access_token: sessionToken,
          user: {
            id: user.id,
            email: `${username}@temp.local`
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
