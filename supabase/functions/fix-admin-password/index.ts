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
    const { password } = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ error: 'Password ist erforderlich' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Generating hash for password:', password);

    // Generate hash using the same Deno bcrypt library we use for verification
    let newHash = '';
    try {
      const { hashSync } = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts');
      newHash = hashSync(password, 10);
      console.log('Generated new hash:', newHash);
    } catch (hashError) {
      console.error('Hash generation error:', hashError);
      return new Response(
        JSON.stringify({ error: 'Hash-Generierung fehlgeschlagen' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Test the hash immediately
    try {
      const { compareSync } = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts');
      const testResult = compareSync(password, newHash);
      console.log('Hash test result:', testResult);

      if (!testResult) {
        return new Response(
          JSON.stringify({ error: 'Hash-Test fehlgeschlagen' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } catch (testError) {
      console.error('Hash test error:', testError);
      return new Response(
        JSON.stringify({ error: 'Hash-Test fehlgeschlagen' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Update the admin user password in the database
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({ 
        password_hash: newHash,
        updated_at: new Date().toISOString()
      })
      .eq('username', 'admin');

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Datenbankupdate fehlgeschlagen' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Admin-Passwort erfolgreich aktualisiert',
        newHash: newHash
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in fix-admin-password function:', error);
    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});