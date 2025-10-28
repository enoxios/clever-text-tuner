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
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    
    if (!claudeApiKey) {
      console.error('CLAUDE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Claude API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header and verify JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, model, systemMessage, glossaryEntries } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build glossary context if provided
    let glossaryContext = '';
    if (glossaryEntries && glossaryEntries.length > 0) {
      glossaryContext = '\n\nGLOSSAR:\n' + glossaryEntries.map(
        (entry: { term: string; explanation: string }) => `- ${entry.term}: ${entry.explanation}`
      ).join('\n');
    }

    const fullPrompt = prompt + glossaryContext;
    const effectiveModel = model || 'claude-sonnet-4-5';

    console.log(`Calling Claude with model: ${effectiveModel}`);

    // Call Anthropic API directly
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: effectiveModel,
        max_tokens: 8000,
        system: systemMessage || 'Du bist ein professioneller Lektor.',
        messages: [
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Claude API error: ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const generatedText = data.content[0].text;

    // Parse response to extract text and changes
    const textMatch = generatedText.match(/LEKTORIERTER TEXT:\s*([\s\S]*?)(?=ÄNDERUNGEN:|$)/i);
    const changesMatch = generatedText.match(/ÄNDERUNGEN:\s*([\s\S]*?)$/i);
    
    const text = textMatch ? textMatch[1].trim() : generatedText;
    const changesText = changesMatch ? changesMatch[1].trim() : '';

    return new Response(
      JSON.stringify({ text, changes: changesText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in call-claude function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
