import { Document, Packer, Paragraph, TextRun, HeadingLevel, SectionType } from 'docx';
import { removeMarkdown, type TextChunk, mergeProcessedChunks } from './documentUtils';
import { callOpenAI } from './openAIService';

export interface TranslationResponse {
  originalText: string;
  translatedText: string;
  notes: { text: string; isCategory: boolean }[];
  detectedLanguage?: string;
}

/**
 * Generate prompt for translation
 */
export const generateTranslationPrompt = (
  text: string,
  style: 'standard' | 'literary' | 'technical',
  sourceLanguage: string,
  targetLanguage: string,
  model: string
): string => {
  let languageInstruction = sourceLanguage === 'auto' 
    ? 'Erkenne die Quellsprache automatisch'
    : `Übersetze von ${getLanguageName(sourceLanguage)}`;

  let styleInstruction = '';
  switch (style) {
    case 'literary':
      styleInstruction = 'Achte besonders auf literarische Qualität, Stil und Nuancen. Bewahre poetische Elemente, Metaphern und den Ton des Originals.';
      break;
    case 'technical':
      styleInstruction = 'Dies ist ein Fachtext. Verwende präzise Fachterminologie und achte auf fachsprachliche Korrektheit. Terminologie hat Vorrang vor stilistischen Erwägungen.';
      break;
    default:
      styleInstruction = 'Erstelle eine ausgewogene Übersetzung mit natürlichem Sprachfluss, die sowohl präzise als auch lesbar ist.';
  }

  const promptTemplate = `
${languageInstruction} ins ${getLanguageName(targetLanguage)}.

${styleInstruction}

WICHTIGE ANWEISUNGEN:
1. Übersetze den gesamten Text vollständig und akkurat
2. Bewahre die ursprüngliche Absatzstruktur und Formatierung
3. Verwende KEINE Markdown-Formatierung in der Übersetzung
4. Füge der Übersetzung keine eigenen Erklärungen oder Anmerkungen hinzu
5. Wenn du dir bei einer Übersetzung unsicher bist, notiere dies separat unter ANMERKUNGEN

Strukturiere deine Antwort in zwei klar getrennte Teile:

ÜBERSETZTER TEXT:
[Hier den vollständigen übersetzten Text einfügen]

ANMERKUNGEN:
KATEGORIE: Quellsprache
- [Erkannte Sprache, falls automatisch erkannt]

KATEGORIE: Übersetzungsentscheidungen
- [Wichtige Übersetzungsentscheidungen erläutern]

KATEGORIE: Kulturelle Anpassungen
- [Kulturelle Anpassungen erläutern]

KATEGORIE: Unsicherheiten
- [Unsicherheiten oder mehrdeutige Begriffe notieren]

Hier ist der zu übersetzende Text:

${text}`;

  return `@${model} ${promptTemplate}`;
};

/**
 * Translate text using OpenAI API
 */
export const translateText = async (
  text: string,
  apiKey: string,
  style: 'standard' | 'literary' | 'technical',
  sourceLanguage: string,
  targetLanguage: string,
  model: string = 'gpt-4o',
  glossaryEntries?: { term: string; explanation: string }[]
): Promise<TranslationResponse | null> => {
  try {
    const prompt = generateTranslationPrompt(text, style, sourceLanguage, targetLanguage, model);
    
    // System message for translation
    const systemMessage = `Du bist ein professioneller Übersetzer mit Expertise in verschiedenen Fachgebieten und Sprachen. 
Deine Aufgabe ist es, Texte präzise zu übersetzen und dabei kulturelle Nuancen zu berücksichtigen.
Strukturiere deine Antwort in zwei klar getrennte Teile: "ÜBERSETZTER TEXT:" und "ANMERKUNGEN:".`;
    
    const apiResponse = await callOpenAI(prompt, apiKey, systemMessage, model, glossaryEntries);
    
    if (!apiResponse) {
      throw new Error('Keine Antwort von der API erhalten');
    }
    
    return processTranslationResponse(text, apiResponse.text, apiResponse.changes);
  } catch (error) {
    console.error('Translation API error:', error);
    throw error;
  }
};

/**
 * Process the translation response from OpenAI
 */
export const processTranslationResponse = (
  originalText: string,
  translatedText: string,
  notesText: string
): TranslationResponse => {
  const notes: { text: string; isCategory: boolean }[] = [];
  
  // Process notes
  const lines = notesText.split('\n')
    .filter(line => line.trim().length > 0);
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.match(/^KATEGORIE:|^Kategorie:/i)) {
      notes.push({
        text: trimmedLine.replace(/^KATEGORIE:|^Kategorie:/i, '').trim(),
        isCategory: true
      });
    } else if (trimmedLine.match(/^[-•*]\s+/)) {
      notes.push({
        text: trimmedLine.replace(/^[-•*]\s+/, '').trim(),
        isCategory: false
      });
    } else if (trimmedLine.match(/^\d+[\.\)]\s+/)) {
      notes.push({
        text: trimmedLine.replace(/^\d+[\.\)]\s+/, '').trim(),
        isCategory: false
      });
    }
  }
  
  return {
    originalText,
    translatedText,
    notes
  };
};

/**
 * Process chunks of text for translation
 */
export const processTranslationChunks = async (
  chunks: TextChunk[],
  apiKey: string,
  style: 'standard' | 'literary' | 'technical',
  sourceLanguage: string,
  targetLanguage: string,
  model: string,
  glossaryEntries?: { term: string; explanation: string }[],
  onChunkProgress?: (completed: number, total: number) => void
): Promise<{ processedChunks: TextChunk[], allNotes: { text: string; isCategory: boolean }[][] }> => {
  // Validate the API key
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API-Schlüssel fehlt');
  }
  
  if (apiKey.includes('Fehler')) {
    throw new Error('Ungültiger API-Schlüssel');
  }
  
  const processedChunks: TextChunk[] = [];
  const allNotes: { text: string; isCategory: boolean }[][] = [];
  
  // Process each chunk sequentially
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      // Generate prompt for this chunk
      let chunkPrompt = chunk.text;
      if (i > 0) {
        chunkPrompt = `Dies ist Teil ${i+1} von ${chunks.length} eines größeren Textes. Übersetze diesen Teil wie üblich:\n\n${chunk.text}`;
      }
      
      // System message for translation
      const systemMessage = `Du bist ein professioneller Übersetzer mit Expertise in verschiedenen Fachgebieten und Sprachen. 
Deine Aufgabe ist es, Texte präzise zu übersetzen und dabei kulturelle Nuancen zu berücksichtigen.
Strukturiere deine Antwort in zwei klar getrennte Teile: "ÜBERSETZTER TEXT:" und "ANMERKUNGEN:".`;
      
      const prompt = generateTranslationPrompt(chunkPrompt, style, sourceLanguage, targetLanguage, model);
      
      // Call the API
      const response = await callOpenAI(prompt, apiKey, systemMessage, model, glossaryEntries);
      
      if (!response) {
        throw new Error(`Fehler bei der Verarbeitung des Textabschnitts ${i+1}`);
      }
      
      // Process the response
      const translationResult = processTranslationResponse(chunk.text, response.text, response.changes);
      
      // Add to processed results
      processedChunks.push({
        text: translationResult.translatedText,
        index: chunk.index
      });
      
      allNotes.push(translationResult.notes);
      
      // Update progress
      if (onChunkProgress) {
        onChunkProgress(i + 1, chunks.length);
      }
      
    } catch (error) {
      console.error(`Error processing chunk ${i}:`, error);
      throw new Error(`Fehler bei der Verarbeitung des Textabschnitts ${i+1}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }
  
  return { processedChunks, allNotes };
};

/**
 * Generate a Word document with only the translated text
 */
export const generateTranslationDocument = async (
  originalText: string,
  translatedText: string,
  notes: { text: string; isCategory: boolean }[],
  sourceLang: string,
  targetLang: string,
  includeOriginal: boolean = false
): Promise<Blob> => {
  // Split texts into paragraphs
  const translatedParagraphs = translatedText.split('\n\n');
  
  // Create document sections
  const docSections: Paragraph[] = [];
  
  // If original text should be included
  if (includeOriginal) {
    const originalParagraphs = originalText.split('\n\n');
    
    docSections.push(
      new Paragraph({
        text: 'Übersetzung',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      }),
      
      new Paragraph({
        children: [
          new TextRun({
            text: `Original: ${sourceLang} → Übersetzung: ${targetLang}`,
            bold: true,
          }),
        ],
        spacing: { after: 400 },
      })
    );
    
    // Create side-by-side sections for each paragraph
    for (let i = 0; i < Math.max(originalParagraphs.length, translatedParagraphs.length); i++) {
      const originalPara = originalParagraphs[i] || '';
      const translatedPara = translatedParagraphs[i] || '';
      
      // Original text heading
      docSections.push(
        new Paragraph({
          text: 'Original:',
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 120 },
        })
      );
      
      // Original text content
      docSections.push(
        new Paragraph({
          children: [new TextRun(originalPara)],
          spacing: { after: 240 },
        })
      );
      
      // Translated text heading
      docSections.push(
        new Paragraph({
          text: 'Übersetzung:',
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 120 },
        })
      );
      
      // Translated text content
      docSections.push(
        new Paragraph({
          children: [new TextRun(translatedPara)],
          spacing: { after: 400 },
        })
      );
    }
  } else {
    // Add only translated text paragraphs
    for (const translatedPara of translatedParagraphs) {
      docSections.push(
        new Paragraph({
          children: [new TextRun(translatedPara)],
          spacing: { after: 200 },
        })
      );
    }
  }
  
  // Add notes section if there are notes and original is included
  if (notes.length > 0 && includeOriginal) {
    docSections.push(
      new Paragraph({
        text: 'Anmerkungen zur Übersetzung',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      })
    );
    
    let currentCategory = '';
    
    notes.forEach(note => {
      if (note.isCategory) {
        currentCategory = note.text;
        docSections.push(
          new Paragraph({
            text: currentCategory,
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          })
        );
      } else {
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${note.text}`,
              }),
            ],
            spacing: { after: 120 },
          })
        );
      }
    });
  }
  
  // Create the document
  const doc = new Document({
    sections: [
      {
        properties: {
          type: SectionType.CONTINUOUS,
        },
        children: docSections,
      },
    ],
  });
  
  return Packer.toBlob(doc);
};

/**
 * Helper function to download the translation as a Word document
 */
export const downloadTranslationDocument = async (
  originalText: string,
  translatedText: string,
  notes: { text: string; isCategory: boolean }[],
  fileName = 'uebersetzung',
  sourceLang: string,
  targetLang: string,
  includeOriginal: boolean = false
): Promise<void> => {
  try {
    const blob = await generateTranslationDocument(
      originalText,
      translatedText,
      notes,
      sourceLang,
      targetLang,
      includeOriginal
    );
    
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.docx`;
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating translation document:', error);
    throw error;
  }
};

/**
 * Helper function to get language name from code
 */
export const getLanguageName = (code: string): string => {
  const languageMap: {[key: string]: string} = {
    'auto': 'Automatisch erkannt',
    'de': 'Deutsch',
    'en': 'Englisch',
    'fr': 'Französisch',
    'es': 'Spanisch',
    'it': 'Italienisch',
    'nl': 'Niederländisch',
    'pl': 'Polnisch',
    'ru': 'Russisch',
    'zh': 'Chinesisch',
    'ja': 'Japanisch',
    'ar': 'Arabisch',
    'pt': 'Portugiesisch',
    'tr': 'Türkisch',
  };
  
  return languageMap[code] || code;
};
