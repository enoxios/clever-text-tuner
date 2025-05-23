
// Document Type Definitions

export interface DocumentStats {
  charCount: number;
  wordCount: number;
  status: 'acceptable' | 'warning' | 'critical';
  statusText: string;
}

export interface ChangeItem {
  text: string;
  isCategory: boolean;
}

export interface LektoratResult {
  text: string;
  changes: ChangeItem[];
}

export interface TextChunk {
  text: string;
  index: number;
}

export interface DocumentError extends Error {
  code?: string;
  details?: string;
}

// Warning limit for document length
export const WARNING_LIMIT = 14500; // Geschätzte Zeichenanzahl für 2900 Wörter
export const CRITICAL_LIMIT = 150000;
export const MAX_CHUNK_SIZE = 10000; // Geschätzte Zeichenanzahl für 2000 Wörter (5 Zeichen pro Wort im Durchschnitt)
