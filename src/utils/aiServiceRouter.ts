import { callOpenAI, processChunks } from './openAIService';
import { callClaude, processClaudeChunks } from './claudeService';
import { toast } from 'sonner';

export interface GlossaryEntry {
  term: string;
  explanation: string;
}

// Helper functions to determine model type
export const isClaudeModel = (model: string): boolean => {
  return model.startsWith('claude-');
};

export const isOpenAIModel = (model: string): boolean => {
  return model.startsWith('gpt-') || model.startsWith('o3-') || model.startsWith('o4-');
};

export const getRequiredApiKeyType = (model: string): 'openai' | 'claude' => {
  if (isClaudeModel(model)) {
    return 'claude';
  }
  return 'openai';
};

/**
 * Main function to call AI models (centralized API key management)
 */
export const callAI = async (
  prompt: string,
  model: string,
  mode: string,
  systemMessage: string,
  glossaryEntries?: GlossaryEntry[]
) => {
  console.log(`aiServiceRouter: Calling AI with model ${model}`);
  
  try {
    if (isOpenAIModel(model)) {
      return await callOpenAI(prompt, model, systemMessage, glossaryEntries);
    } else if (isClaudeModel(model)) {
      return await callClaude(prompt, model, systemMessage, glossaryEntries);
    }
    
    throw new Error(`Unbekanntes Modell: ${model}`);
  } catch (error) {
    console.error('aiServiceRouter: Error calling AI:', error);
    
    // If GPT-5 fails, fallback to Claude
    if (model.startsWith('gpt-5')) {
      console.log('GPT-5 failed, falling back to Claude Sonnet 4.5');
      toast.info('GPT-5 ist nicht verfügbar, verwende Claude Sonnet als Alternative...');
      
      try {
        return await callClaude(prompt, 'claude-sonnet-4-5', systemMessage, glossaryEntries);
      } catch (fallbackError) {
        console.error('Fallback to Claude also failed:', fallbackError);
        toast.error('Sowohl GPT-5 als auch Claude sind nicht verfügbar');
        throw fallbackError;
      }
    }
    
    throw error;
  }
};

/**
 * Process document chunks with AI (centralized API key management)
 */
export const processAIChunks = async (
  chunks: Array<{text: string, index: number}>,
  mode: string,
  model: string,
  systemMessage: string,
  glossaryEntries?: GlossaryEntry[],
  onChunkProgress?: (completed: number, total: number) => void
) => {
  console.log(`aiServiceRouter: Processing ${chunks.length} chunks with model ${model}`);
  
  try {
    if (isOpenAIModel(model)) {
      return await processChunks(chunks, mode, model, systemMessage, glossaryEntries, onChunkProgress);
    } else if (isClaudeModel(model)) {
      return await processClaudeChunks(chunks, mode, model, systemMessage, glossaryEntries, onChunkProgress);
    }
    
    throw new Error(`Unbekanntes Modell: ${model}`);
  } catch (error) {
    console.error('aiServiceRouter: Error processing chunks:', error);
    
    // If GPT-5 fails, fallback to Claude
    if (model.startsWith('gpt-5')) {
      console.log('GPT-5 failed, falling back to Claude Sonnet 4.5 for chunk processing');
      toast.info('GPT-5 ist nicht verfügbar, verwende Claude Sonnet für die Verarbeitung...');
      
      try {
        return await processClaudeChunks(chunks, mode, 'claude-sonnet-4-5', systemMessage, glossaryEntries, onChunkProgress);
      } catch (fallbackError) {
        console.error('Fallback chunk processing to Claude also failed:', fallbackError);
        throw fallbackError;
      }
    }
    
    throw error;
  }
};
