
import { toast } from 'sonner';

interface OpenAIResponse {
  text: string;
  changes: string;
}

export const callOpenAI = async (
  prompt: string,
  apiKey: string,
  customSystemMessage?: string
): Promise<OpenAIResponse | null> => {
  try {
    const systemMessage = customSystemMessage || 'Du bist ein professioneller Lektor und hilfst dabei, Texte zu verbessern. Strukturiere deine Antwort in zwei klar getrennte Teile: "LEKTORIERTER TEXT:" und "ÄNDERUNGEN:".';
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API-Fehler: ${errorData.error?.message || 'Unbekannter Fehler'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Keine Antwort von der API erhalten');
    }

    // Teile den Inhalt in Text und Änderungen auf
    const textMatch = content.match(/LEKTORIERTER TEXT:\s*\n([\s\S]*?)(?=ÄNDERUNGEN:|$)/i);
    const changesMatch = content.match(/ÄNDERUNGEN:\s*\n([\s\S]*)/i);

    // Log für Debugging
    console.log('API Antwort:', content);
    console.log('Extrahierter Text:', textMatch ? textMatch[1] : 'Nicht gefunden');
    console.log('Extrahierte Änderungen:', changesMatch ? changesMatch[1] : 'Nicht gefunden');

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
