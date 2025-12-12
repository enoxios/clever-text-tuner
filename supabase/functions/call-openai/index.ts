import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
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

    if (!prompt || !model) {
      return new Response(
        JSON.stringify({ error: 'Prompt and model are required' }),
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

    // Determine parameters based on model
    // GPT-5.2/5.1 use max_completion_tokens and reasoning parameter
    // GPT-5.2/5.1 with reasoning=none supports temperature
    const isGPT52 = model === 'gpt-5.2' || model.startsWith('gpt-5.2-');
    const isGPT51 = model === 'gpt-5.1' || model.startsWith('gpt-5.1-');
    const isGPT5Family = model.startsWith('gpt-5') || model.startsWith('o3-') || model.startsWith('o4-') || model.startsWith('gpt-4.1');
    
    const requestBody: any = {
      model,
      messages: [
        { role: 'system', content: systemMessage || 'Du bist ein professioneller Lektor.' },
        { role: 'user', content: fullPrompt }
      ],
    };

    // GPT-5.2 and GPT-5.1: use reasoning and text parameters
    if (isGPT52 || isGPT51) {
      requestBody.max_completion_tokens = 16000;
      // GPT-5.2/5.1 with reasoning none supports temperature
      requestBody.reasoning = { effort: 'none' };
      requestBody.temperature = 0.7;
    } else if (isGPT5Family) {
      // Other GPT-5 family models (gpt-5-mini, gpt-5-nano, gpt-4.1)
      requestBody.max_completion_tokens = 16000;
      // These don't support temperature
    } else {
      // Legacy models (gpt-4o, etc.) use max_tokens and temperature
      requestBody.max_tokens = 4000;
      requestBody.temperature = 0.7;
    }

    console.log(`Calling OpenAI with model: ${model}, params:`, JSON.stringify(requestBody));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

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
    console.error('Error in call-openai function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
