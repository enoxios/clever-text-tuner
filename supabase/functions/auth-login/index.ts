import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
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

    let userData = null;
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

    // Verify password using Deno-compatible bcrypt
    console.log('Attempting password verification for user:', username);
    console.log('Stored hash:', user.password_hash);
    console.log('Input password length:', password.length);
    
    let passwordMatch = false;
    try {
      // Import Deno-compatible BCrypt library
      const { compareSync } = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts');
      passwordMatch = compareSync(password, user.password_hash);
      console.log('Password match result:', passwordMatch);
    } catch (bcryptError) {
      console.error('BCrypt error:', bcryptError);
      // Fallback to simple comparison for debugging
      console.log('Falling back to simple comparison for debugging');
      passwordMatch = false; // Always false for security, but we can see the logs
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

    // Create a temporary user in auth for session management
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: `${username}@temp.local`,
      password: user.id, // Use user ID as temp password
      user_metadata: { 
        username: user.username,
        user_type: type,
        custom_user_id: user.id
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentifizierungsfehler' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Sign in the user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: `${username}@temp.local`,
      password: user.id
    });

    if (signInError) {
      console.error('Sign in error:', signInError);
      return new Response(
        JSON.stringify({ error: 'Login fehlgeschlagen' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user: user,
        session: signInData.session
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