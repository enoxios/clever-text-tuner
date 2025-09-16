import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApiKeyRequest {
  openai_api_key?: string;
  claude_api_key?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the simple auth token
    const token = authHeader.replace('Bearer ', '');
    
    if (token !== 'admin123') {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use a fixed user ID for the simple auth system
    const userId = 'simple-auth-user';

    switch (req.method) {
      case 'GET': {
        const { data, error } = await supabase
          .from('user_api_keys')
          .select('openai_api_key, claude_api_key')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Database error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch API keys' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(data || { openai_api_key: null, claude_api_key: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'POST':
      case 'PUT': {
        const body: ApiKeyRequest = await req.json();
        
        // Validate API key formats (basic validation)
        if (body.openai_api_key && !body.openai_api_key.startsWith('sk-')) {
          return new Response(
            JSON.stringify({ error: 'Invalid OpenAI API key format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if record exists
        const { data: existing } = await supabase
          .from('user_api_keys')
          .select('id')
          .eq('user_id', userId)
          .single();

        let result;
        if (existing) {
          // Update existing record
          result = await supabase
            .from('user_api_keys')
            .update({
              ...(body.openai_api_key !== undefined && { openai_api_key: body.openai_api_key }),
              ...(body.claude_api_key !== undefined && { claude_api_key: body.claude_api_key }),
            })
            .eq('user_id', userId)
            .select();
        } else {
          // Insert new record
          result = await supabase
            .from('user_api_keys')
            .insert({
              user_id: userId,
              openai_api_key: body.openai_api_key || null,
              claude_api_key: body.claude_api_key || null,
            })
            .select();
        }

        const { data, error } = result;
        
        if (error) {
          console.error('Database error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to save API keys' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'DELETE': {
        const { error } = await supabase
          .from('user_api_keys')
          .delete()
          .eq('user_id', userId);

        if (error) {
          console.error('Database error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to delete API keys' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
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
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});