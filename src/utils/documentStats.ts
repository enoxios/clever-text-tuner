
import { DocumentStats, WARNING_LIMIT, CRITICAL_LIMIT } from './documentTypes';

// Calculate document statistics
export const calculateDocumentStats = (text: string): DocumentStats => {
  const characters = text.length;
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  
  let status: 'acceptable' | 'warning' | 'critical' = 'acceptable';
  let statusText = 'Akzeptable Länge';
  
  if (characters >= CRITICAL_LIMIT) {
    status = 'critical';
    statusText = 'Sehr lang!';
  } else if (characters >= WARNING_LIMIT) {
    status = 'warning';
    statusText = 'Potenziell problematisch';
  }
  
  return {
    charCount: characters,
    wordCount: words,
    status,
    statusText
  };
};
