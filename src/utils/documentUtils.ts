import mammoth from 'mammoth';

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

// Warning limit for document length
export const WARNING_LIMIT = 30000;
export const CRITICAL_LIMIT = 150000;

// Process Word document and extract text
export const extractTextFromDocx = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (loadEvent) => {
      if (!loadEvent.target?.result) {
        reject(new Error('Failed to read file'));
        return;
      }
      
      try {
        const arrayBuffer = loadEvent.target.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value);
      } catch (error) {
        console.error('Error extracting text:', error);
        reject(new Error('Failed to extract text from the Word document'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading the file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

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

// Remove Markdown formatting for compatibility with Word
export const removeMarkdown = (text: string): string => {
  if (!text) return '';
  
  return text
    // Remove headings
    .replace(/^#+ (.*?)$/gm, '$1')
    // Remove bold
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remove italic
    .replace(/\*(.*?)\*/g, '$1')
    // Remove underscores for italic
    .replace(/_(.*?)_/g, '$1')
    // Remove inline code
    .replace(/`(.*?)`/g, '$1')
    // Format Markdown lists but keep numbering/bullets
    .replace(/^- (.*?)$/gm, '• $1')
    // Clean up links
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    // Remove other formatting elements
    .replace(/~~/g, '')
    .replace(/>/g, '')
    .trim();
};

// Process API response to extract text and changes
export const processLektoratResponse = (content: string): LektoratResult => {
  // Default return structure
  const result: LektoratResult = {
    text: '',
    changes: []
  };
  
  try {
    // Search for sections in the response
    const textMatch = content.match(/LEKTORIERTER TEXT:\s*\n([\s\S]*?)(?=ÄNDERUNGEN:|$)/i);
    const changesMatch = content.match(/ÄNDERUNGEN:\s*\n([\s\S]*)/i);
    
    // Extract edited text
    if (textMatch && textMatch[1]) {
      result.text = textMatch[1].trim();
    } else {
      // Fallback: Try normal headings
      const altTextMatch = content.match(/Lektorierter Text\s*\n([\s\S]*?)(?=Änderungen|$)/i);
      if (altTextMatch && altTextMatch[1]) {
        result.text = altTextMatch[1].trim();
      } else {
        // Last fallback: Use the entire content
        result.text = content;
      }
    }
    
    // Extract changes list with categories
    if (changesMatch && changesMatch[1]) {
      const changesText = changesMatch[1].trim();
      
      // Split into lines for categories and changes
      const lines = changesText.split('\n').filter(line => line.trim().length > 0);
      
      // Extract categories and changes
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Category line
        if (trimmedLine.match(/^KATEGORIE:|^Kategorie:/i)) {
          result.changes.push({
            text: trimmedLine.replace(/^KATEGORIE:|^Kategorie:/i, '').trim(),
            isCategory: true
          });
        } 
        // Bullet point
        else if (trimmedLine.match(/^[-•*]\s+/)) {
          result.changes.push({
            text: trimmedLine.replace(/^[-•*]\s+/, '').trim(),
            isCategory: false
          });
        }
        // Numbered point
        else if (trimmedLine.match(/^\d+[\.\)]\s+/)) {
          result.changes.push({
            text: trimmedLine.replace(/^\d+[\.\)]\s+/, '').trim(),
            isCategory: false
          });
        }
      }
    }
  } catch (e) {
    console.error('Error extracting text and changes:', e);
  }
  
  return result;
};

// Sample prompts for the API
export const generatePrompt = (text: string, mode: 'standard' | 'nurKorrektur', model: string): string => {
  let promptText = '';
  
  switch (mode) {
    case 'standard':
      promptText = `
Führe ein umfassendes Lektorat des folgenden Textes durch. 

Fokussiere auf folgende Aspekte:

1. INHALTLICHE PRÜFUNG
   - Struktur und Logik: Prüfe, ob der Text gut strukturiert und logisch aufgebaut ist
   - Kohärenz: Überprüfe Handlungsstränge, Argumentationen oder Gedankengänge auf Nachvollziehbarkeit

2. SPRACHLICHE ÜBERARBEITUNG
   - Stil: Optimiere den Schreibstil (passend zu Genre/Zielgruppe), mache verschachtelte Sätze verständlicher
   - Wortwahl: Ersetze unpassende, redundante oder zu häufig wiederholte Wörter
   - Ton und Perspektive: Prüfe auf Konsistenz im Ton und in der Erzählperspektive

WICHTIG: Verwende im Ergebnistext KEINE Markdown-Formatierung, da dieser später in Word eingefügt wird.

Strukturiere deine Antwort wie folgt:

LEKTORIERTER TEXT:
[Hier den vollständigen überarbeiteten Text einfügen]

ÄNDERUNGEN:
KATEGORIE: Struktur und Logik
- [Änderung mit Begründung]
- [Änderung mit Begründung]

KATEGORIE: Stil
- [Änderung mit Begründung]
- [Änderung mit Begründung]

KATEGORIE: Wortwahl
- [Änderung mit Begründung]
- [Änderung mit Begründung]

KATEGORIE: Ton und Perspektive
- [Änderung mit Begründung]
- [Änderung mit Begründung]

Hier ist der zu lektorierende Text:

${text}`;
      break;
    
    case 'nurKorrektur':
      promptText = `
Führe eine reine Korrektur von Rechtschreibung und Grammatik des folgenden Textes durch. 

WICHTIG:
- Korrigiere AUSSCHLIESSLICH Rechtschreibfehler, Grammatikfehler und falsche Zeichensetzung
- Verändere NICHT den Stil, die Wortwahl oder den Inhalt des Textes
- Behalte die ursprüngliche Struktur und Formulierung bei
- Verwende im Ergebnistext KEINE Markdown-Formatierung, da dieser später in Word eingefügt wird

Strukturiere deine Antwort wie folgt:

LEKTORIERTER TEXT:
[Hier den vollständigen korrigierten Text einfügen]

ÄNDERUNGEN:
KATEGORIE: Rechtschreibung und Grammatik
- [Korrektur 1 mit kurzer Begründung]
- [Korrektur 2 mit kurzer Begründung]
(usw.)

Hier ist der zu lektorierende Text:

${text}`;
      break;
  }
  
  return `@${model} ${promptText}`;
};
