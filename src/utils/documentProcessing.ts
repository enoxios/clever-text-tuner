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

// Process API response to extract text and changes - robust Markdown support
export const processLektoratResponse = (content: string): LektoratResult => {
  const result: LektoratResult = {
    text: '',
    changes: []
  };
  
  try {
    console.log('processLektoratResponse - Full content:', content);
    
    // Robuste Regex für verschiedene Formatierungen (analog zu claudeService.ts)
    let textMatch = content.match(/\*{0,2}LEKTORIERTER TEXT\*{0,2}:?\s*\n+([\s\S]*?)(?=\n+\*{0,2}ÄNDERUNGEN\*{0,2}:|$)/i);
    let changesMatch = content.match(/\*{0,2}ÄNDERUNGEN\*{0,2}:?\s*\n+([\s\S]*)/i);
    
    // Fallback: Versuche alternative Regex-Pattern
    if (!textMatch) {
      textMatch = content.match(/(?:LEKTORIERTER\s+TEXT|LEKTORIERTER_TEXT|LEKTORAT).*?:\s*\n+([\s\S]*?)(?=\n+(?:ÄNDERUNGEN|CHANGES).*?:|$)/i);
    }
    
    if (!changesMatch) {
      changesMatch = content.match(/(?:ÄNDERUNGEN|CHANGES).*?:\s*\n+([\s\S]*)/i);
    }

    // Zusätzliche Fallback-Pattern für verschiedene Formate
    if (!textMatch) {
      const altTextMatch = content.match(/Lektorierter Text\s*\n([\s\S]*?)(?=Änderungen|$)/i);
      if (altTextMatch && altTextMatch[1]) {
        textMatch = altTextMatch;
      }
    }

    // NEW: Enhanced fallback parsing for unstructured responses
    if (!textMatch && !changesMatch) {
      console.log('processLektoratResponse - Trying unstructured parsing');
      
      // Check if content contains any typical change indicators
      const hasChangeIndicators = /(?:geändert|korrigiert|verbessert|angepasst|ersetzt|hinzugefügt|entfernt)/i.test(content);
      
      if (hasChangeIndicators) {
        // Split content into sentences and try to identify text vs changes
        const sentences = content.split(/[.!?]\s+/).map(s => s.trim()).filter(s => s.length > 0);
        
        let textContent = '';
        let changeContent = '';
        
        for (const sentence of sentences) {
          if (/(?:geändert|korrigiert|verbessert|angepasst|ersetzt|hinzugefügt|entfernt)/i.test(sentence)) {
            changeContent += sentence + '. ';
          } else {
            textContent += sentence + '. ';
          }
        }
        
        if (textContent.trim()) {
          result.text = textContent.trim();
          console.log('processLektoratResponse - Extracted text from unstructured content');
        }
        
        if (changeContent.trim()) {
          // Convert change content to structured changes
          result.changes.push({
            text: 'Automatisch erkannte Änderungen',
            isCategory: true
          });
          result.changes.push({
            text: changeContent.trim(),
            isCategory: false
          });
          console.log('processLektoratResponse - Created changes from unstructured content');
        }
      }
    }

    // Log für Debugging
    console.log('processLektoratResponse - Content preview:', content.substring(0, 300));
    console.log('processLektoratResponse - Text gefunden:', textMatch ? 'JA' : 'NEIN');
    console.log('processLektoratResponse - Änderungen gefunden:', changesMatch ? 'JA' : 'NEIN');
    
    if (textMatch && textMatch[1]) {
      // Bereinige Markdown-Formatierung aus dem Text
      result.text = textMatch[1]
        .replace(/\*{1,2}([^*]*?)\*{1,2}/g, '$1') // Entferne **bold** und *italic*
        .trim();
      console.log('processLektoratResponse - Extrahierter Text Länge:', result.text.length);
    } else if (!result.text) {
      console.log('processLektoratResponse - Fallback zu vollständigem Content');
      result.text = content;
    }
    
    if (changesMatch && changesMatch[1]) {
      const changesText = changesMatch[1]
        .replace(/\*{1,2}([^*]*?)\*{1,2}/g, '$1') // Entferne Markdown-Formatierung
        .trim();
      
      console.log('processLektoratResponse - Änderungen Text Länge:', changesText.length);
      console.log('processLektoratResponse - Änderungen Text Content:', changesText);
      
      const lines = changesText.split('\n').filter(line => line.trim().length > 0);
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Erweiterte Kategorie-Erkennung (auch für Markdown)
        if (trimmedLine.match(/^(?:\*{0,2})?(?:KATEGORIE|Kategorie)(?:\*{0,2})?:/i)) {
          const categoryText = trimmedLine
            .replace(/^(?:\*{0,2})?(?:KATEGORIE|Kategorie)(?:\*{0,2})?:/i, '')
            .replace(/\*{1,2}([^*]*?)\*{1,2}/g, '$1') // Entferne Markdown
            .trim();
          result.changes.push({
            text: categoryText,
            isCategory: true
          });
        } else if (trimmedLine.match(/^[-•*]\s+/)) {
          const changeText = trimmedLine
            .replace(/^[-•*]\s+/, '')
            .replace(/\*{1,2}([^*]*?)\*{1,2}/g, '$1') // Entferne Markdown
            .trim();
          result.changes.push({
            text: changeText,
            isCategory: false
          });
        } else if (trimmedLine.match(/^\d+[\.\)]\s+/)) {
          const changeText = trimmedLine
            .replace(/^\d+[\.\)]\s+/, '')
            .replace(/\*{1,2}([^*]*?)\*{1,2}/g, '$1') // Entferne Markdown
            .trim();
          result.changes.push({
            text: changeText,
            isCategory: false
          });
        } else if (trimmedLine.length > 10) {
          // NEW: Handle unstructured lines as changes
          result.changes.push({
            text: trimmedLine.replace(/\*{1,2}([^*]*?)\*{1,2}/g, '$1'),
            isCategory: false
          });
        }
      }
      
      console.log('processLektoratResponse - Anzahl extrahierter Änderungen:', result.changes.length);
    }
    
    // NEW: Final fallback - if no changes found but we have content, try to extract any changes
    if (result.changes.length === 0 && content.length > 100) {
      console.log('processLektoratResponse - Final fallback for changes extraction');
      console.log('processLektoratResponse - Content to analyze for changes:', content.substring(0, 200));
      
      // Look for any structured content that might be changes
      const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
      
      for (const paragraph of paragraphs) {
        const lines = paragraph.split('\n').filter(l => l.trim().length > 0);
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          // Look for lines that seem like changes (contain certain keywords or patterns)
          if (trimmedLine.match(/(?:wurde|wurden|ist|sind|haben|hat)\s+(?:geändert|korrigiert|verbessert|angepasst|ersetzt)/i) ||
              trimmedLine.match(/^[-•*]\s+/) ||
              trimmedLine.match(/^\d+[\.\)]\s+/) ||
              trimmedLine.match(/(?:Änderung|Korrektur|Verbesserung|Anpassung)/i)) {
            
            result.changes.push({
              text: trimmedLine.replace(/^[-•*\d\.\)\s]+/, '').replace(/\*{1,2}([^*]*?)\*{1,2}/g, '$1').trim(),
              isCategory: trimmedLine.includes(':') && !trimmedLine.match(/^[-•*\d]/),
            });
          }
        }
      }
      
      if (result.changes.length > 0) {
        console.log('processLektoratResponse - Found changes in final fallback:', result.changes.length);
      } else {
        // Ultimate fallback: if we still have no structured changes, create a generic change from the string
        console.log('processLektoratResponse - Ultimate fallback: creating generic change from content');
        result.changes.push({
          text: 'API-Antwortanalyse',
          isCategory: true
        });
        
        // Take the first few sentences as a generic change description
        const sentences = content.split(/[.!?]\s+/).slice(0, 3).filter(s => s.trim().length > 10);
        if (sentences.length > 0) {
          result.changes.push({
            text: `Rohe API-Antwort (erste Sätze): ${sentences.join('. ')}...`,
            isCategory: false
          });
        } else {
          result.changes.push({
            text: `Vollständige API-Antwort erhalten (${content.length} Zeichen). Struktur nicht erkannt.`,
            isCategory: false
          });
        }
      }
    }
    
  } catch (e) {
    console.error('processLektoratResponse - Error extracting text and changes:', e);
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
  
  // Fallback: If no categories found at all, flatten all non-category items
  if (categoryMap.size === 0) {
    const flatChanges = allChanges.flat().filter(c => !c.isCategory && c.text.trim().length > 0);
    if (flatChanges.length > 0) {
      console.log('mergeChanges fallback: No categories found, using default category with', flatChanges.length, 'items');
      return [
        { text: 'Allgemeine Änderungen', isCategory: true },
        ...flatChanges
      ];
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
