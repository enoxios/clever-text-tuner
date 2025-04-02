
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, SectionType } from 'docx';

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
export const generatePrompt = (text: string, mode: 'standard' | 'nurKorrektur' | 'kochbuch', model: string): string => {
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
      
    case 'kochbuch':
      promptText = `
Prüfe und verbessere das folgende Rezept als erfahrener Rezeptredakteur nach diesen Richtlinien:

ZUR ÜBERPRÜFUNG DER ZUTATENLISTEN:
- Entferne Doppelpunkte nach Überschriften/Zwischenüberschriften
- Ordne Zutaten in der Reihenfolge, wie sie im Text zuerst erwähnt werden
- Achte auf korrekte Zuordnung zu Teilrezepten und deren Reihenfolge
- Korrigiere Rechtschreibung und Grammatik nach Duden
- Verwende Halbgeviert-Striche bei Mengenangaben (z.B. 1–2)
- Schreibe Adjektive/Adverbien am Zeilenanfang klein
- Ergänze fehlende Zutaten mit "XX" als Mengenplatzhalter
- Zeige Bruchzahlen als Zähler/Nenner (z.B. 1/2)
- Keine Bullet Points in der Zutatenliste verwenden
- Wasser nicht in der Zutatenliste, nur im Zubereitungstext erwähnen

ZUR ÜBERPRÜFUNG DER ZUBEREITUNGSTEXTE:
- Entferne Doppelpunkte nach Überschriften/Zwischenüberschriften
- Korrigiere Grammatik und Rechtschreibung
- Ändere "Hitze" zu "Temperatur"
- Verwende korrekt Halbgeviert-Striche bei von-bis-Angaben
- Ersetze normale durch französische Anführungszeichen »...«
- Ändere "Soße" zu "Sauce"
- Formuliere stichwortartige Sätze zu vollständigen Sätzen
- Füge Artikel bei jeder Zutat im Text hinzu
- Teile Zubereitungsschritte in Absätze ohne Nummerierung
- Verwende Kurzschreibweise für Maßeinheiten (EL, TL, g, kg, °C)
- Schreibe Zahlen vor Maßeinheiten als Ziffern, sonst ausgeschrieben
- Beginne jedes Teilrezept mit einleitender Phrase
- Verwende vielfältigen Wortschatz, vermeide Wortwiederholungen
- Schreibe "etwa" statt "ca."

BESONDERE REGELN:
- Immer "Karotten" statt "Möhren" verwenden
- Immer "Gewürznelken" statt nur "Nelken" verwenden
- Bei Singular in der Zutatenliste auch im Text Singular verwenden
- "Trockenschleudern", "trockenschütteln", "trockentupfen" zusammenschreiben

PRIORITÄT: Die wichtigste Regel ist die korrekte Reihenfolge der Zutaten entsprechend ihrer Erwähnung im Zubereitungstext.

WICHTIG: Verwende im Ergebnistext KEINE Markdown-Formatierung, da dieser später in Word eingefügt wird.

Strukturiere deine Antwort wie folgt:

LEKTORIERTER TEXT:
[Hier den vollständig überarbeiteten Rezepttext einfügen]

ÄNDERUNGEN:
KATEGORIE: Zutatenliste
- [Änderung mit Begründung]
- [Änderung mit Begründung]

KATEGORIE: Zubereitungstext
- [Änderung mit Begründung]
- [Änderung mit Begründung]

KATEGORIE: Formatierung
- [Änderung mit Begründung]
- [Änderung mit Begründung]

Hier ist das zu lektorierende Rezept:

${text}`;
      break;
  }
  
  return `@${model} ${promptText}`;
};

// Function to generate a Word document from lektorat results
export const generateWordDocument = async (
  editedText: string, 
  changes: ChangeItem[]
): Promise<Blob> => {
  // Create paragraphs from the edited text
  const textParagraphs = editedText.split('\n\n').map(paragraph => 
    new Paragraph({
      children: [
        new TextRun(paragraph)
      ],
    })
  );

  // Create paragraphs for the changes
  const changeParagraphs: Paragraph[] = [];
  let currentCategory = '';

  changes.forEach(change => {
    if (change.isCategory) {
      currentCategory = change.text;
      changeParagraphs.push(
        new Paragraph({
          text: currentCategory,
          heading: HeadingLevel.HEADING_2,
          spacing: {
            after: 200,
          },
        })
      );
    } else {
      changeParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${change.text}`,
            }),
          ],
          spacing: {
            after: 120,
          },
        })
      );
    }
  });

  // Create a new document with all content in appropriate sections
  const doc = new Document({
    sections: [
      {
        properties: {
          type: SectionType.CONTINUOUS,
        },
        children: [
          // Add the edited text first
          new Paragraph({
            text: 'Lektorierter Text',
            heading: HeadingLevel.HEADING_1,
            spacing: {
              after: 200,
            },
          }),
          ...textParagraphs,
          
          // Add a page break before the changes
          new Paragraph({
            children: [new TextRun({ text: '', break: 1 })],
          }),
          
          // Add the changes section
          new Paragraph({
            text: 'Vorgenommene Änderungen',
            heading: HeadingLevel.HEADING_1,
            spacing: {
              after: 200,
            },
          }),
          ...changeParagraphs,
        ],
      },
    ],
  });
  
  // Generate the document as a blob
  return Packer.toBlob(doc);
};

// Helper function to download the Word document
export const downloadWordDocument = async (
  editedText: string, 
  changes: ChangeItem[], 
  fileName = 'lektorierter-text'
): Promise<void> => {
  try {
    const blob = await generateWordDocument(editedText, changes);
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.docx`;
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating Word document:', error);
    throw error;
  }
};
