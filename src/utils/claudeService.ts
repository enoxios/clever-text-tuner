import { supabase } from '@/integrations/supabase/client';

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
    
    const result = await callClaude(chunk.text, model, systemMessage, glossaryEntries);
    
    if (result) {
      processedChunks.push({ text: result.text, index: chunk.index });
      if (result.changes) {
        // Parse changes into array format
        const changeLines = result.changes.split('\n').filter(line => line.trim());
        allChanges.push(changeLines.map(line => ({ text: line, isCategory: false })));
      }
    }
    
    if (onChunkProgress) {
      onChunkProgress(i + 1, chunks.length);
    }
  }
  
  return { processedChunks, allChanges };
};
