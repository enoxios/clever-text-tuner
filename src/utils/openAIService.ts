import { supabase } from '@/integrations/supabase/client';

export interface OpenAIResponse {
  text: string;
  changes: string;
}

export const callOpenAI = async (
  prompt: string,
  model: string,
  customSystemMessage?: string,
  glossaryEntries?: Array<{term: string, explanation: string}>
): Promise<OpenAIResponse | null> => {
  try {
    console.log(`Calling call-openai Edge Function with model: ${model}`);
    
    const { data, error } = await supabase.functions.invoke('call-openai', {
      body: { 
        prompt, 
        model, 
        systemMessage: customSystemMessage,
        glossaryEntries 
      }
    });
    
    if (error) {
      console.error('OpenAI Edge Function error:', error);
      throw new Error(error.message || 'Fehler beim Aufrufen der OpenAI Edge Function');
    }
    
    if (!data) {
      throw new Error('Keine Antwort von der Edge Function erhalten');
    }
    
    return data;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
};

export const processChunks = async (
  chunks: Array<{text: string, index: number}>,
  mode: string,
  model: string,
  systemMessage: string,
  glossaryEntries?: Array<{term: string, explanation: string}>,
  onChunkProgress?: (completed: number, total: number) => void
): Promise<{processedChunks: Array<any>, allChanges: Array<any>}> => {
  const processedChunks = [];
  const allChanges = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length}`);
    
    const result = await callOpenAI(chunk.text, model, systemMessage, glossaryEntries);
    
    if (result) {
      processedChunks.push({ text: result.text, index: chunk.index });
      if (result.changes) {
        // Parse changes with proper category detection
        const changeLines = result.changes.split('\n').filter(line => line.trim());
        const parsedChanges = changeLines.map(line => {
          const trimmedLine = line.trim();
          
          // Detect category lines (e.g., "KATEGORIE: Rechtschreibung")
          const isCategoryLine = trimmedLine.match(/^(?:\*{0,2})?(?:KATEGORIE|Kategorie)(?:\*{0,2})?:/i);
          
          if (isCategoryLine) {
            // Extract category text without "KATEGORIE:" prefix
            const categoryText = trimmedLine
              .replace(/^(?:\*{0,2})?(?:KATEGORIE|Kategorie)(?:\*{0,2})?:/i, '')
              .replace(/\*{1,2}([^*]*?)\*{1,2}/g, '$1')
              .trim();
            return { text: categoryText, isCategory: true };
          } else {
            // Remove bullet points and markdown from changes
            const changeText = trimmedLine
              .replace(/^[-•*\d\.\)]+\s*/, '')
              .replace(/\*{1,2}([^*]*?)\*{1,2}/g, '$1')
              .trim();
            return { text: changeText, isCategory: false };
          }
        });
        
        console.log(`Chunk ${i + 1}: Parsed ${parsedChanges.length} changes (${parsedChanges.filter(c => c.isCategory).length} categories)`);
        allChanges.push(parsedChanges);
      }
    }
    
    if (onChunkProgress) {
      onChunkProgress(i + 1, chunks.length);
    }
  }
  
  console.log(`processChunks completed: ${allChanges.length} change arrays`);
  return { processedChunks, allChanges };
};
