
import mammoth from 'mammoth';
import { DocumentError } from './documentTypes';

/**
 * Enhanced document extraction with better error handling and fallback mechanisms
 */
export const extractTextFromDocx = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (loadEvent) => {
      if (!loadEvent.target?.result) {
        const error = new Error('Datei konnte nicht gelesen werden') as DocumentError;
        error.code = 'FILE_READ_ERROR';
        reject(error);
        return;
      }
      
      try {
        const arrayBuffer = loadEvent.target.result as ArrayBuffer;
        
        // Try with default options first
        try {
          console.log('Attempting to extract text with default options...');
          const result = await mammoth.extractRawText({ 
            arrayBuffer 
            // Using only type-safe options
          });
          
          // Check if we actually got text content
          if (result.value.trim().length === 0) {
            throw new Error('Extracted text is empty');
          }
          
          console.log('Successfully extracted text with default options');
          resolve(result.value);
        } catch (primaryError) {
          console.error('Primary extraction failed:', primaryError);
          
          // Fallback: Try with alternative options
          try {
            console.log('Attempting fallback extraction method...');
            // Use simple configuration without styleMap
            const result = await mammoth.extractRawText({
              arrayBuffer
              // Using only type-safe options
              // Removed styleMap as it's not in the type definition
            });
            
            if (result.value.trim().length > 0) {
              console.log('Successfully extracted text with fallback options');
              resolve(result.value);
              return;
            }
            
            throw new Error('Fallback extraction produced empty text');
          } catch (fallbackError) {
            console.error('Fallback extraction also failed:', fallbackError);
            const docError = new Error('Dokument enthält möglicherweise nicht unterstützte Elemente wie "Alternate Content" oder komplexe Formatierungen') as DocumentError;
            docError.code = 'DOCUMENT_FORMAT_ERROR';
            docError.details = primaryError instanceof Error ? primaryError.message : String(primaryError);
            reject(docError);
          }
        }
      } catch (error) {
        console.error('Error in document processing pipeline:', error);
        const docError = new Error('Fehler beim Verarbeiten des Dokuments') as DocumentError;
        docError.code = 'PROCESSING_ERROR';
        docError.details = error instanceof Error ? error.message : String(error);
        reject(docError);
      }
    };
    
    reader.onerror = () => {
      const error = new Error('Fehler beim Lesen der Datei') as DocumentError;
      error.code = 'FILE_READ_ERROR';
      reject(error);
    };
    
    reader.readAsArrayBuffer(file);
  });
};
