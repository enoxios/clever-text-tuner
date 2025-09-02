import { toast } from 'sonner';

interface OpenAIResponse {
  text: string;
  changes: string;
}

interface OpenAIResponseWithGlossary extends OpenAIResponse {
  text: string;
  changes: string;
}

export const callOpenAI = async (
  prompt: string,
  apiKey: string,
  customSystemMessage?: string,
  model: string = 'gpt-4o',
  glossaryEntries?: { term: string; explanation: string; }[]
): Promise<OpenAIResponse | null> => {
  try {
    // Standardwert für den System-Message
    let systemMessage = customSystemMessage || 'Du bist ein professioneller Lektor und hilfst dabei, Texte zu verbessern. Strukturiere deine Antwort in zwei klar getrennte Teile: "LEKTORIERTER TEXT:" und "ÄNDERUNGEN:".';
    
    // Füge Glossar zum System-Message hinzu, wenn vorhanden
    if (glossaryEntries && glossaryEntries.length > 0) {
      const glossaryText = glossaryEntries
        .map(entry => `${entry.term}: ${entry.explanation}`)
        .join('\n');
      
      systemMessage = `${systemMessage}\n\nVerwende folgendes Glossar für die Lektorierung:\n${glossaryText}`;
    }

    // Log für Debugging
    console.log('Using model:', model);
    console.log('Using system message:', systemMessage?.substring(0, 100) + '...');
    
    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API-Schlüssel fehlt');
    }
    
    // Verhindere, dass eine Fehlermeldung als API-Schlüssel verwendet wird
    if (apiKey.includes('Fehler')) {
      throw new Error('Ungültiger API-Schlüssel. Bitte geben Sie einen gültigen OpenAI API-Schlüssel ein');
    }
    
    // Create proper headers object
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`
    });
    
    // Handle correct model mapping for API calls
    let apiModel = model;
    // Map display model names to correct API model names
    if (model === 'gpt-5-2025-08-07') {
      apiModel = 'gpt-5-2025-08-07';
    } else if (model === 'gpt-5-mini-2025-08-07') {
      apiModel = 'gpt-5-mini-2025-08-07';
    } else if (model === 'gpt-5-nano-2025-08-07') {
      apiModel = 'gpt-5-nano-2025-08-07';
    } else if (model === 'gpt-4.1') {
      apiModel = 'gpt-4-turbo';
    } else if (model === 'gpt-4.1-mini') {
      apiModel = 'gpt-4-turbo-mini';
    } 
    // No need to map gpt-4.5-preview as it's already correct for the API
    
    console.log('Original model selected:', model);
    console.log('Mapped API model:', apiModel);
    
    // Prepare the request body
    const requestBody = {
      model: apiModel,
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
    console.log('Request model:', apiModel);
    
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

// New function to process document chunks in sequence
export const processChunks = async (
  chunks: { text: string; index: number }[],
  apiKey: string,
  mode: 'standard' | 'nurKorrektur' | 'kochbuch',
  model: string,
  systemMessage: string,
  glossaryEntries?: { term: string; explanation: string; }[],
  onChunkProgress?: (completed: number, total: number) => void
): Promise<{ processedChunks: { text: string; index: number }[], allChanges: { text: string; isCategory: boolean }[][] }> => {
  // Validiere den API-Schlüssel bevor wir mit der Verarbeitung beginnen
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API-Schlüssel fehlt');
  }
  
  if (apiKey.includes('Fehler')) {
    throw new Error('Ungültiger API-Schlüssel. Bitte geben Sie einen gültigen OpenAI API-Schlüssel ein');
  }
  
  const processedChunks: { text: string; index: number }[] = [];
  const allChanges: { text: string; isCategory: boolean }[][] = [];
  
  // Process each chunk sequentially
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      // Generate prompt for this chunk
      // Wenn es sich nicht um den ersten Chunk handelt, fügen wir einen Hinweis hinzu
      let chunkPrompt = '';
      if (i > 0) {
        chunkPrompt = `Dies ist Teil ${i+1} von ${chunks.length} eines größeren Textes. Lektoriere diesen Teil wie üblich:\n\n${chunk.text}`;
      } else {
        chunkPrompt = chunk.text;
      }
      
      // Add the model to the prompt to ensure it's being used correctly
      const prompt = `@${model} ${chunkPrompt}`;
      console.log(`Processing chunk ${i+1}/${chunks.length} with model: ${model}`);
      
      // Call the API
      const response = await callOpenAI(prompt, apiKey, systemMessage, model, glossaryEntries);
      
      if (!response) {
        throw new Error(`Fehler bei der Verarbeitung des Textabschnitts ${i+1}`);
      }
      
      // Process the response
      const processedResult = {
        text: response.text,
        index: chunk.index,
        changes: response.changes
      };
      
      // Extract changes
      const parsedResult = {
        text: response.text,
        changes: response.changes
          .split('\n')
          .filter(line => line.trim().length > 0)
          .map(line => {
            // Check if this is a category line
            const isCategoryLine = line.match(/^KATEGORIE:|^Kategorie:/i);
            return {
              text: isCategoryLine 
                ? line.replace(/^KATEGORIE:|^Kategorie:/i, '').trim()
                : line.replace(/^[-•*]\s+|\d+[\.\)]\s+/, '').trim(),
              isCategory: !!isCategoryLine
            };
          })
      };
      
      // Add to processed results
      processedChunks.push({
        text: processedResult.text,
        index: processedResult.index
      });
      
      allChanges.push(parsedResult.changes);
      
      // Update progress
      if (onChunkProgress) {
        onChunkProgress(i + 1, chunks.length);
      }
      
    } catch (error) {
      console.error(`Error processing chunk ${i}:`, error);
      throw new Error(`Fehler bei der Verarbeitung des Textabschnitts ${i+1}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }
  
  return { processedChunks, allChanges };
};
