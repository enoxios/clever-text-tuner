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
    const requestBody = {
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
      ],
      temperature: 0.7
    };
    
    // Add the correct token parameter based on the model
    if (model.includes('o3')) {
      // O3 models use max_completion_tokens
      Object.assign(requestBody, { max_completion_tokens: 4000 });
    } else {
      // Other models use max_tokens
      Object.assign(requestBody, { max_tokens: 4000 });
    }
    
    console.log('Sending request to OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unbekannter Fehler' } }));
      const errorMessage = errorData.error?.message || `HTTP Fehler: ${response.status} ${response.statusText}`;
      console.error('API error response:', errorData);
      throw new Error(`API-Fehler: ${errorMessage}`);
    }

    const data = await response.json();
    
    if (!data || !data.choices || data.choices.length === 0) {
      throw new Error('Leere Antwort von der API erhalten');
    }
    
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Keine Antwort von der API erhalten');
    }

    // Teile den Inhalt in Text und Änderungen auf
    const textMatch = content.match(/LEKTORIERTER TEXT:\s*\n([\s\S]*?)(?=ÄNDERUNGEN:|$)/i);
    const changesMatch = content.match(/ÄNDERUNGEN:\s*\n([\s\S]*)/i);

    // Log für Debugging
    console.log('API Antwort erhalten');
    console.log('Extrahierter Text:', textMatch ? 'Gefunden' : 'Nicht gefunden');
    console.log('Extrahierte Änderungen:', changesMatch ? 'Gefunden' : 'Nicht gefunden');

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
