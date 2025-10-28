import { callOpenAI, processChunks } from './openAIService';
import { callClaude, processClaudeChunks } from './claudeService';
import { toast } from 'sonner';

interface AIResponse {
  text: string;
  changes: string;
}

// Check if a model is a Claude model
export const isClaudeModel = (model: string): boolean => {
  return model.startsWith('claude-');
};

// Check if a model is an OpenAI model
export const isOpenAIModel = (model: string): boolean => {
  return model.startsWith('gpt-') || model.startsWith('o3-') || model.startsWith('o4-');
};

// Get the required API key type for a model
export const getRequiredApiKeyType = (model: string): 'openai' | 'claude' => {
  if (isClaudeModel(model)) {
    return 'claude';
  }
  return 'openai';
};

// Main AI service router function
export const callAI = async (
  prompt: string,
  openaiApiKey: string,
  claudeApiKey: string,
  customSystemMessage?: string,
  model: string = 'gpt-4o',
  glossaryEntries?: { term: string; explanation: string; }[]
): Promise<AIResponse | null> => {
  try {
    if (isClaudeModel(model)) {
      console.log('Routing to Claude service for model:', model);
      
      if (!claudeApiKey || claudeApiKey.trim() === '') {
        toast.error('Claude API-Schlüssel erforderlich für dieses Modell');
        throw new Error('Claude API-Schlüssel fehlt');
      }
      
      return await callClaude(prompt, claudeApiKey, customSystemMessage, model, glossaryEntries);
    } else if (isOpenAIModel(model)) {
      console.log('Routing to OpenAI service for model:', model);
      
      if (!openaiApiKey || openaiApiKey.trim() === '') {
        toast.error('OpenAI API-Schlüssel erforderlich für dieses Modell');
        throw new Error('OpenAI API-Schlüssel fehlt');
      }
      
      return await callOpenAI(prompt, openaiApiKey, customSystemMessage, model, glossaryEntries);
    } else {
      throw new Error(`Unbekanntes Modell: ${model}`);
    }
  } catch (error) {
    console.error('AI Service Router Error:', error);
    
    // Fallback logic: If GPT-5 fails, try Claude Sonnet
    if (model.startsWith('gpt-5-') && claudeApiKey && claudeApiKey.trim() !== '') {
      console.log('GPT-5 failed, falling back to Claude Sonnet');
      toast.info('GPT-5 ist nicht verfügbar, verwende Claude Sonnet als Alternative...');
      
      try {
        return await callClaude(prompt, claudeApiKey, customSystemMessage, 'claude-sonnet-4-5', glossaryEntries);
      } catch (fallbackError) {
        console.error('Fallback to Claude also failed:', fallbackError);
        toast.error('Sowohl GPT-5 als auch Claude sind nicht verfügbar');
        return null;
      }
    }
    
    return null;
  }
};

// Chunk processing router
export const processAIChunks = async (
  chunks: { text: string; index: number }[],
  openaiApiKey: string,
  claudeApiKey: string,
  mode: 'standard' | 'nurKorrektur' | 'kochbuch',
  model: string,
  systemMessage: string,
  glossaryEntries?: { term: string; explanation: string; }[],
  onChunkProgress?: (completed: number, total: number) => void
): Promise<{ processedChunks: { text: string; index: number }[], allChanges: { text: string; isCategory: boolean }[][] }> => {
  try {
    if (isClaudeModel(model)) {
      console.log('Routing chunk processing to Claude service for model:', model);
      
      if (!claudeApiKey || claudeApiKey.trim() === '') {
        throw new Error('Claude API-Schlüssel fehlt für Chunk-Verarbeitung');
      }
      
      return await processClaudeChunks(chunks, claudeApiKey, mode, model, systemMessage, glossaryEntries, onChunkProgress);
    } else if (isOpenAIModel(model)) {
      console.log('Routing chunk processing to OpenAI service for model:', model);
      
      if (!openaiApiKey || openaiApiKey.trim() === '') {
        throw new Error('OpenAI API-Schlüssel fehlt für Chunk-Verarbeitung');
      }
      
      return await processChunks(chunks, openaiApiKey, mode, model, systemMessage, glossaryEntries, onChunkProgress);
    } else {
      throw new Error(`Unbekanntes Modell für Chunk-Verarbeitung: ${model}`);
    }
  } catch (error) {
    console.error('AI Chunk Processing Router Error:', error);
    
    // Fallback logic for chunk processing
    if (model.startsWith('gpt-5-') && claudeApiKey && claudeApiKey.trim() !== '') {
      console.log('GPT-5 chunk processing failed, falling back to Claude Sonnet');
      toast.info('GPT-5 ist nicht verfügbar, verwende Claude Sonnet für die Verarbeitung...');
      
      try {
        return await processClaudeChunks(chunks, claudeApiKey, mode, 'claude-sonnet-4-5', systemMessage, glossaryEntries, onChunkProgress);
      } catch (fallbackError) {
        console.error('Fallback chunk processing to Claude also failed:', fallbackError);
        throw fallbackError;
      }
    }
    
    throw error;
  }
};