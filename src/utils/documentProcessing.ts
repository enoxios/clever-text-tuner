import { LektoratResult, ChangeItem, TextChunk } from './documentTypes';
import { MAX_CHUNK_SIZE } from './documentTypes';

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
  const result: LektoratResult = {
    text: '',
    changes: []
  };
  
  try {
    const textMatch = content.match(/LEKTORIERTER TEXT:\s*\n([\s\S]*?)(?=ÄNDERUNGEN:|$)/i);
    const changesMatch = content.match(/ÄNDERUNGEN:\s*\n([\s\S]*)/i);
    
    if (textMatch && textMatch[1]) {
      result.text = textMatch[1].trim();
    } else {
      const altTextMatch = content.match(/Lektorierter Text\s*\n([\s\S]*?)(?=Änderungen|$)/i);
      if (altTextMatch && altTextMatch[1]) {
        result.text = altTextMatch[1].trim();
      } else {
        result.text = content;
      }
    }
    
    if (changesMatch && changesMatch[1]) {
      const changesText = changesMatch[1].trim();
      
      const lines = changesText.split('\n').filter(line => line.trim().length > 0);
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.match(/^KATEGORIE:|^Kategorie:/i)) {
          result.changes.push({
            text: trimmedLine.replace(/^KATEGORIE:|^Kategorie:/i, '').trim(),
            isCategory: true
          });
        } else if (trimmedLine.match(/^[-•*]\s+/)) {
          result.changes.push({
            text: trimmedLine.replace(/^[-•*]\s+/, '').trim(),
            isCategory: false
          });
        } else if (trimmedLine.match(/^\d+[\.\)]\s+/)) {
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

/**
 * Splits a document into manageable chunks while preserving paragraph integrity.
 * @param text The full document text
 * @returns Array of text chunks
 */
export const splitDocumentIntoChunks = (text: string): TextChunk[] => {
  const paragraphs = text.split(/\n\n+/);
  const chunks: TextChunk[] = [];
  let currentChunk = "";
  let chunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    if ((currentChunk.length + paragraph.length + 2) > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex
      });
      currentChunk = paragraph;
      chunkIndex++;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex
    });
  }
  
  return chunks;
};

/**
 * Merges the processed text chunks back into a single document
 * @param processedChunks Array of processed text chunks
 * @returns The complete merged text
 */
export const mergeProcessedChunks = (processedChunks: TextChunk[]): string => {
  const sortedChunks = [...processedChunks].sort((a, b) => a.index - b.index);
  return sortedChunks.map(chunk => chunk.text).join("\n\n");
};

/**
 * Merges multiple sets of changes from different chunks
 * @param allChanges Array of changes from different chunks
 * @returns Merged changes with proper categories
 */
export const mergeChanges = (allChanges: ChangeItem[][]): ChangeItem[] => {
  const mergedChanges: ChangeItem[] = [];
  const categoryMap = new Map<string, ChangeItem[]>();
  
  for (const changes of allChanges) {
    let currentCategory = "";
    
    for (const change of changes) {
      if (change.isCategory) {
        currentCategory = change.text;
        if (!categoryMap.has(currentCategory)) {
          categoryMap.set(currentCategory, []);
        }
      } else if (currentCategory) {
        categoryMap.get(currentCategory)?.push(change);
      }
    }
  }
  
  for (const [category, items] of categoryMap.entries()) {
    mergedChanges.push({
      text: category,
      isCategory: true
    });
    
    mergedChanges.push(...items);
  }
  
  return mergedChanges;
};
