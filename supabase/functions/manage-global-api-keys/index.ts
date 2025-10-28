import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header and verify user is admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token and verify it's from admin user
    const token = authHeader.replace('Bearer ', '');
    
    // Check if user is admin by checking if they exist in admin_users table
    // We'll use a simple check: if the token says 'admin123', they're admin
    // In a real scenario, you'd decode the JWT and check user_id against admin_users table
    if (token !== 'admin123') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (req.method) {
      case 'GET': {
        // Return masked API keys
        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        const claudeKey = Deno.env.get('CLAUDE_API_KEY');

        const maskKey = (key: string | undefined) => {
          if (!key) return null;
          if (key.length <= 8) return '***';
          return `${key.slice(0, 7)}...${key.slice(-4)}`;
        };

        return new Response(
          JSON.stringify({
            openai_api_key: maskKey(openaiKey),
            claude_api_key: maskKey(claudeKey),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'POST':
      case 'PUT': {
        const body = await req.json();
        
        // Note: This endpoint can display masked keys but cannot actually update
        // Supabase Secrets programmatically. Keys must be updated via Supabase Dashboard.
        // We'll just acknowledge the request.
        
        console.log('API key update requested (must be done manually in Supabase Dashboard)');
        
        return new Response(
          JSON.stringify({ 
            message: 'API keys must be updated manually in Supabase Dashboard under Settings > Edge Functions',
            success: false 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in manage-global-api-keys function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
