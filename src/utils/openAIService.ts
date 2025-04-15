
import { toast } from 'sonner';

interface OpenAIResponse {
  text: string;
  changes: string;
}

export const callOpenAI = async (
  prompt: string,
  apiKey: string,
  customSystemMessage?: string,
  model: string = 'gpt-4o'
): Promise<OpenAIResponse | null> => {
  try {
    // Standardwert für den System-Message
    const systemMessage = customSystemMessage || 'Du bist ein professioneller Lektor und hilfst dabei, Texte zu verbessern. Strukturiere deine Antwort in zwei klar getrennte Teile: "LEKTORIERTER TEXT:" und "ÄNDERUNGEN:".';
    
    // Log für Debugging
    console.log('Using model:', model);
    console.log('Using system message:', systemMessage);
    
    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API-Schlüssel fehlt');
    }
    
    // Create proper headers object
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`
    };
    
    // Prepare the request body based on the model
    const requestBody: any = {
      model: model,
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    };
    
    // Add model-specific parameters
    if (model.includes('o3')) {
      // O3 models use max_completion_tokens 
      requestBody.max_completion_tokens = 3000; // Reduced from 4000 to ensure we get a complete response
    } else {
      // Other models use max_tokens and temperature
      requestBody.max_tokens = 4000;
      requestBody.temperature = 0.7;
    }
    
    console.log('Sending request to OpenAI API...');
    console.log('Request body:', JSON.stringify(requestBody));
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    // Log the raw response status and headers for debugging
    console.log('API response status:', response.status);
    console.log('API response status text:', response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unbekannter Fehler' } }));
      const errorMessage = errorData.error?.message || `HTTP Fehler: ${response.status} ${response.statusText}`;
      console.error('API error response:', errorData);
      throw new Error(`API-Fehler: ${errorMessage}`);
    }

    const data = await response.json();
    console.log('API response data received:', data ? 'Yes' : 'No');
    
    if (!data || !data.choices || data.choices.length === 0) {
      console.error('Empty or invalid response from API:', data);
      throw new Error('Leere oder ungültige Antwort von der API erhalten');
    }
    
    const content = data.choices[0]?.message?.content;

    if (!content && content !== '') {
      console.error('No content in API response:', data.choices[0]);
      throw new Error('Keine Textantwort in der API-Antwort gefunden');
    }

    // Check if the response was cut off (finish_reason: "length")
    if (data.choices[0]?.finish_reason === 'length') {
      console.warn('Response was cut off due to length. Consider shorter input or chunking the request.');
      toast.warning('Die Antwort wurde wegen Längenbegrenzung abgeschnitten. Versuchen Sie kürzeren Text oder wählen Sie ein anderes Modell.');
    }

    console.log('Content received:', content ? content.substring(0, 100) + '...' : 'Empty');
    
    // Handle empty content case
    if (!content || content.trim() === '') {
      console.log('Empty content received, using default structure');
      return {
        text: prompt, // Return original text
        changes: 'Keine Änderungen vorgenommen, da keine Antwort vom Modell erhalten wurde.'
      };
    }

    // Teile den Inhalt in Text und Änderungen auf
    const textMatch = content.match(/LEKTORIERTER TEXT:\s*\n([\s\S]*?)(?=ÄNDERUNGEN:|$)/i);
    const changesMatch = content.match(/ÄNDERUNGEN:\s*\n([\s\S]*)/i);

    // Log für Debugging
    console.log('API Antwort erhalten');
    console.log('Extrahierter Text:', textMatch ? 'Gefunden' : 'Nicht gefunden');
    console.log('Extrahierte Änderungen:', changesMatch ? 'Gefunden' : 'Nicht gefunden');

    // If we can't find the sections, return the entire content as text
    if (!textMatch && !changesMatch) {
      console.log('LEKTORIERTER TEXT and ÄNDERUNGEN sections not found, returning full content');
      return {
        text: content,
        changes: 'Die API-Antwort enthielt keine strukturierten Abschnitte.'
      };
    }

    return {
      text: textMatch && textMatch[1] ? textMatch[1].trim() : content,
      changes: changesMatch && changesMatch[1] ? changesMatch[1].trim() : ''
    };
  } catch (error) {
    console.error('OpenAI API-Fehler:', error);
    toast.error(`Fehler bei der API-Anfrage: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    return null;
  }
};
