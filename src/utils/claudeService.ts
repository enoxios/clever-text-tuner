import { supabase } from '@/integrations/supabase/client';
import { generatePrompt } from './documentProcessing';

export interface ClaudeResponse {
  text: string;
  changes: string;
}

export const callClaude = async (
  prompt: string,
  model: string = 'claude-sonnet-4-5',
  customSystemMessage?: string,
  glossaryEntries?: Array<{term: string, explanation: string}>
): Promise<ClaudeResponse | null> => {
  try {
    console.log(`Calling call-claude Edge Function with model: ${model}`);
    
    const { data, error } = await supabase.functions.invoke('call-claude', {
      body: { 
        prompt, 
        model,
        systemMessage: customSystemMessage,
        glossaryEntries 
      }
    });
    
    if (error) {
      console.error('Claude Edge Function error:', error);
      throw new Error(error.message || 'Fehler beim Aufrufen der Claude Edge Function');
    }
    
    if (!data) {
      throw new Error('Keine Antwort von der Edge Function erhalten');
    }
    
    return data;
  } catch (error) {
    console.error('Error calling Claude:', error);
    throw error;
  }
};

export const processClaudeChunks = async (
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
    
    // Use structured prompt for each chunk
    const chunkPrompt = generatePrompt(chunk.text, mode as 'standard' | 'nurKorrektur' | 'kochbuch', model);
    const result = await callClaude(chunkPrompt, model, systemMessage, glossaryEntries);
    
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
        
        // Add default category if none detected
        const hasCategory = parsedChanges.some(c => c.isCategory);
        if (!hasCategory && parsedChanges.length > 0) {
          const defaultCategory = mode === 'nurKorrektur' 
            ? 'Rechtschreibung und Grammatik' 
            : 'Allgemeine Änderungen';
          console.log(`Chunk ${i + 1}: No categories detected, adding default category: ${defaultCategory}`);
          parsedChanges.unshift({ text: defaultCategory, isCategory: true });
        }
        
        // Filter empty lines
        const filteredChanges = parsedChanges.filter(c => c.text.length > 0);
        
        console.log(`Chunk ${i + 1}: Parsed ${filteredChanges.length} changes (${filteredChanges.filter(c => c.isCategory).length} categories)`);
        allChanges.push(filteredChanges);
      }
    }
    
    if (onChunkProgress) {
      onChunkProgress(i + 1, chunks.length);
    }
  }
  
  console.log(`processClaudeChunks completed: ${allChanges.length} change arrays`);
  return { processedChunks, allChanges };
};
