import { toast } from 'sonner';

interface ClaudeResponse {
  text: string;
  changes: string;
}

export const callClaude = async (
  prompt: string,
  apiKey: string,
  customSystemMessage?: string,
  model: string = 'claude-sonnet-4-20250514',
  glossaryEntries?: { term: string; explanation: string; }[]
): Promise<ClaudeResponse | null> => {
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
    console.log('Using Claude model:', model);
    console.log('Using system message:', systemMessage?.substring(0, 100) + '...');
    
    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API-Schlüssel fehlt');
    }
    
    // Verhindere, dass eine Fehlermeldung als API-Schlüssel verwendet wird
    if (apiKey.includes('Fehler')) {
      throw new Error('Ungültiger API-Schlüssel. Bitte geben Sie einen gültigen Claude API-Schlüssel ein');
    }
    
    // Create proper headers object
    const headers = new Headers({
      'Content-Type': 'application/json',
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01'
    });
    
    // Prepare the request body for Claude API
    const requestBody = {
      model: model,
      max_tokens: 4000,
      temperature: 0.7,
      system: systemMessage,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    };
    
    console.log('Sending request to Claude API...');
    console.log('Request model:', model);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    // Log the raw response status and headers for debugging
    console.log('Claude API response status:', response.status);
    console.log('Claude API response status text:', response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unbekannter Fehler' } }));
      const errorMessage = errorData.error?.message || `HTTP Fehler: ${response.status} ${response.statusText}`;
      console.error('Claude API error response:', errorData);
      throw new Error(`Claude API-Fehler: ${errorMessage}`);
    }

    const data = await response.json();
    console.log('Claude API response data received:', data ? 'Yes' : 'No');
    
    if (!data || !data.content || data.content.length === 0) {
      console.error('Empty or invalid response from Claude API:', data);
      throw new Error('Leere oder ungültige Antwort von der Claude API erhalten');
    }
    
    const content = data.content[0]?.text;

    // Validate content properly
    if (content === null || content === undefined) {
      console.error('No content in Claude API response:', data.content[0]);
      throw new Error('Keine Textantwort in der Claude API-Antwort gefunden');
    }

    console.log('Content received length:', content.length);
    console.log('Content preview:', content.substring(0, 100) + '...');
    
    // Handle empty content case
    if (content.trim() === '') {
      console.log('Empty content received from Claude API');
      return {
        text: 'Es konnte keine Antwort vom Modell generiert werden. Bitte versuchen Sie es mit einem anderen Modell oder einem kürzeren Text.',
        changes: 'Das KI-Modell hat eine leere Antwort zurückgegeben. Dies kann an einem zu langen Text oder an Einschränkungen des Modells liegen.'
      };
    }

    // Teile den Inhalt in Text und Änderungen auf
    const textMatch = content.match(/LEKTORIERTER TEXT:\s*\n([\s\S]*?)(?=ÄNDERUNGEN:|$)/i);
    const changesMatch = content.match(/ÄNDERUNGEN:\s*\n([\s\S]*)/i);

    // Log für Debugging
    console.log('Claude API Antwort erhalten');
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
    console.error('Claude API-Fehler:', error);
    toast.error(`Fehler bei der Claude API-Anfrage: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    return null;
  }
};

// Function to process document chunks in sequence with Claude
export const processClaudeChunks = async (
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
    throw new Error('Claude API-Schlüssel fehlt');
  }
  
  if (apiKey.includes('Fehler')) {
    throw new Error('Ungültiger API-Schlüssel. Bitte geben Sie einen gültigen Claude API-Schlüssel ein');
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
      
      console.log(`Processing chunk ${i+1}/${chunks.length} with Claude model: ${model}`);
      
      // Call the Claude API
      const response = await callClaude(chunkPrompt, apiKey, systemMessage, model, glossaryEntries);
      
      if (!response) {
        throw new Error(`Fehler bei der Verarbeitung des Textabschnitts ${i+1} mit Claude`);
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
      
      // Add slight delay between requests to be respectful to the API
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`Error processing chunk ${i} with Claude:`, error);
      throw new Error(`Fehler bei der Verarbeitung des Textabschnitts ${i+1} mit Claude: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }
  
  return { processedChunks, allChanges };
};