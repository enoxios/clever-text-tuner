
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
    console.log('Using system message:', systemMessage?.substring(0, 100) + '...');
    
    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API-Schlüssel fehlt');
    }
    
    // Create proper headers object
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`
    };
    
    // Prepare the request body
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
      max_tokens: 4000,
      temperature: 0.7
    };
    
    console.log('Sending request to OpenAI API...');
    console.log('Request model:', model);
    
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

    // Validate content properly
    if (content === null || content === undefined) {
      console.error('No content in API response:', data.choices[0]);
      throw new Error('Keine Textantwort in der API-Antwort gefunden');
    }

    console.log('Content received length:', content.length);
    console.log('Content preview:', content.substring(0, 100) + '...');
    
    // Handle empty content case
    if (content.trim() === '') {
      console.log('Empty content received from API');
      return {
        text: 'Es konnte keine Antwort vom Modell generiert werden. Bitte versuchen Sie es mit einem anderen Modell oder einem kürzeren Text.',
        changes: 'Das KI-Modell hat eine leere Antwort zurückgegeben. Dies kann an einem zu langen Text oder an Einschränkungen des Modells liegen.'
      };
    }

    // Teile den Inhalt in Text und Änderungen auf
    const textMatch = content.match(/LEKTORIERTER TEXT:\s*\n([\s\S]*?)(?=ÄNDERUNGEN:|$)/i);
    const changesMatch = content.match(/ÄNDERUNGEN:\s*\n([\s\S]*)/i);

    // Log für Debugging
    console.log('API Antwort erhalten');
    console.log('Extrahierter Text:', textMatch ? 'Gefunden' : 'Nicht gefunden');
    console.log('Extrahierte Änderungen:', changesMatch ? 'Gefunden' : 'Nicht gefunden');

    // If we can't find the sections, return the entire content as text with a note
    if (!textMatch && !changesMatch) {
      console.log('LEKTORIERTER TEXT and ÄNDERUNGEN sections not found, returning full content');
      return {
        text: content.trim(),
        changes: 'Die API-Antwort enthielt keine strukturierten Abschnitte mit "LEKTORIERTER TEXT" und "ÄNDERUNGEN".'
      };
    }

    return {
      text: textMatch && textMatch[1] ? textMatch[1].trim() : content.trim(),
      changes: changesMatch && changesMatch[1] ? changesMatch[1].trim() : 'Keine detaillierten Änderungen verfügbar.'
    };
  } catch (error) {
    console.error('OpenAI API-Fehler:', error);
    toast.error(`Fehler bei der API-Anfrage: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    return null;
  }
};

