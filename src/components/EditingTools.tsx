import { useState, useEffect } from 'react';
import { Info, ChevronDown } from 'lucide-react';

interface EditingToolsProps {
  onModeChange: (mode: 'standard' | 'nurKorrektur' | 'kochbuch') => void;
  onModelChange: (model: string) => void;
  onSystemMessageChange?: (message: string) => void;
  defaultSystemMessage?: string;
  initialMode?: 'standard' | 'nurKorrektur' | 'kochbuch';
  disabled?: boolean;
}

const EditingTools = ({ 
  onModeChange, 
  onModelChange,
  onSystemMessageChange,
  defaultSystemMessage = 'Du bist ein professioneller Lektor und hilfst dabei, Texte zu verbessern. Strukturiere deine Antwort in zwei klar getrennte Teile: "LEKTORIERTER TEXT:" und "ÄNDERUNGEN:".',
  initialMode = 'standard',
  disabled = false 
}: EditingToolsProps) => {
  const [activeMode, setActiveMode] = useState<'standard' | 'nurKorrektur' | 'kochbuch'>(initialMode);
  const [activeModel, setActiveModel] = useState('gpt-4o');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [systemMessage, setSystemMessage] = useState(defaultSystemMessage);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  
  const standardSystemMessage = 'Du bist ein professioneller Lektor und hilfst dabei, Texte zu verbessern. Führe ein umfassendes Lektorat mit inhaltlicher und sprachlicher Überarbeitung durch. Achte auf Struktur, Logik, Stil und Wortwahl. Strukturiere deine Antwort in zwei klar getrennte Teile: "LEKTORIERTER TEXT:" und "ÄNDERUNGEN:".';
  
  const nurKorrekturSystemMessage = 'Du bist ein professioneller Korrektor und hilfst dabei, Texte zu korrigieren. Korrigiere ausschließlich Rechtschreibung, Grammatik und Zeichensetzung, ohne den Stil oder Inhalt zu verändern. Strukturiere deine Antwort in zwei klar getrennte Teile: "LEKTORIERTER TEXT:" und "ÄNDERUNGEN:".';
  
  const kochbuchSystemMessage = `Nehme die Rolle eines erfahrenen Rezeptredakteurs ein, um Rezepte hinsichtlich ihrer Genauigkeit und Qualität zu überprüfen und zu verbessern.
 
Teil 1: Überprüfung der Zutatenlisten
Kein Doppelpunkt nach Überschriften und Zwischenüberschriften: Entferne nach Überschriften (auch Zwischenüberschriften wie "Zutaten", "Anrichten", "Für den Teig" Doppelpunkte.
Reihenfolge der Zutaten: Vergewissere dich, dass die Zutaten in der Reihenfolge aufgeführt sind, in der sie im Rezepttext zuerst erwähnt werden. Es ist nur entscheiden, wann die einzelne Zutat erstmals im Zubereitungstext erwähnt werden.
Zuordnung zu Teilrezepten: Achte auf Zwischenüberschriften in Fettschrift ohne Satzzeichen am Ende und ordne die Zutaten entsprechend zu.
Reihenfolge der Teilrezepte: Sortiere die Teilrezepte in der Reihenfolge an, wie sie im Zubereitungstext nacheinander bearbeitet werden.
Rechtschreibung und Grammatik: Überprüfe die Texte gemäß der deutschen Duden-Rechtschreibung und korrigiere Fehler.
Mengenangaben: Ersetze Bindestriche durch Halbgeviert-Striche bei Mengenangaben und korrigiere bei Bedarf.
Adjektive und Adverbien: Stelle sicher, dass diese am Zeilenanfang kleingeschrieben werden.
Fehlende Zutaten: Füge fehlende Zutaten in die Liste ein und kennzeichne sie mit "XX" als Platzhalter für die Menge. Stelle sie an die Position, in der sie im Zubereitungstext vorkommen.
Bruchzahlen: Achte darauf, dass Bruchzahlen als Zähler/Nenner (z.B. 1/2) dargestellt werden.
Liste: Verwende keine Bullet Points, die Zutaten werden ohne diese aufgelistet.
Wasser: Wasser wird in der Zutatenliste nicht erwähnt, die Mengenangabe steht im Zubereitungstext.
 
Teil 2: Überprüfung der Zubereitungstexte
Kein Doppelpunkt nach Überschriften und Zwischenüberschriften: Entferne nach Überschriften Doppelpunkte.
Rechtschreibung und Grammatik: Korrigiere alle gefundenen Fehler in der Rechtschreibung, Grammatik und Zeichensetzung.
Temperaturangaben: Ändere "Hitze" zu "Temperatur".
Von-Bis-Angaben: Prüfe die korrekte Verwendung des Halbgeviert-Strichs und korrigiere, wo nötig.
Anführungszeichen: Ersetze alle nicht französischen Anführungszeichen durch französische.
Schreibweise von "Soße": Korrigiere alle Vorkommen mit ß zu "Sauce".
Stichwortartige Sätze: Formuliere sie in vollständige Sätze um, um sie ansprechender zu gestalten.
Artikel bei Zutaten: Füge bei jeder Zutat im Text den bestimmten Artikel hinzu. Achte auf den korrekten Kasus.
Gliederung in Absätze: Teile die Zubereitungsschritte in Absätze auf, ohne sie zu nummerieren.
Maßeinheiten: Maßeinheiten wie EL, TL, g, kg, °C werden immer in der Kurzschreibweise angegeben.
Zahlen: Zahlen und Ziffern werden nur vor Maßeinheiten in Ziffern angegeben. In allen anderen Fällen werden Zahlen ausgeschrieben.
Einleitungssatz: Starte jedes Teilrezept mit einer einleitenden Phrase.
Schreibstil: Achte auf einen vielfältigen Wortschatz, verwende Synonyme, um Wortdopplungen zu umgehen.
Abkürzungen: Maßeinheiten werden in der Kurzschreibweise angegeben. Alle anderen Begriffe nicht. Beispielsweise schreiben wir statt „ca." im Zubereitungstext „etwa".

WICHTIG! Achte darauf Formatierung und Fettungen möglichst beizubehalten

Wichtige Regeln:
- "Karotten" statt "Möhren"
- "Gewürznelken" statt nur "Nelken"
- Bei Singular in der Zutatenliste auch im Zubereitungstext Singular verwenden
- Keine Bullet Points, keine Nummerierung
- Keine Fettungen, wenn nicht im Original
- Wasser nur im Zubereitungstext nennen

Strukturiere deine Antwort in zwei klar getrennte Teile: "LEKTORIERTER TEXT:" und "ÄNDERUNGEN:".`;
  
  useEffect(() => {
    let newSystemMessage;
    
    switch(activeMode) {
      case 'standard':
        newSystemMessage = standardSystemMessage;
        break;
      case 'nurKorrektur':
        newSystemMessage = nurKorrekturSystemMessage;
        break;
      case 'kochbuch':
        newSystemMessage = kochbuchSystemMessage;
        break;
      default:
        newSystemMessage = standardSystemMessage;
    }
    
    setSystemMessage(newSystemMessage);
    
    if (onSystemMessageChange) {
      onSystemMessageChange(newSystemMessage);
    }
  }, [activeMode, onSystemMessageChange]);
  
  const handleModeChange = (mode: 'standard' | 'nurKorrektur' | 'kochbuch') => {
    if (disabled) return;
    
    setActiveMode(mode);
    onModeChange(mode);
    setShowModeDropdown(false);
  };
  
  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveModel(event.target.value);
    onModelChange(event.target.value);
  };
  
  const handleSystemMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSystemMessage(event.target.value);
    if (onSystemMessageChange) {
      onSystemMessageChange(event.target.value);
    }
  };
  
  const getModelDescription = (model: string): string => {
    const descriptions: Record<string, string> = {
      'gpt-4o': 'Aktuellstes OpenAI-Modell mit höchster Qualität',
      'gpt-4o-mini': 'Schnelleres und kostengünstigeres Modell',
      'o3-mini': 'Experimentelles Modell - für kurze Texte geeignet. Bei Problemen bitte GPT-4o verwenden.'
    };
    
    return descriptions[model] || `${model}: Ausgewähltes KI-Modell für das Lektorat.`;
  };
  
  const getModeDescription = (mode: 'standard' | 'nurKorrektur' | 'kochbuch'): string => {
    const descriptions: Record<string, string> = {
      'standard': 'Umfassende inhaltliche und sprachliche Überarbeitung mit detaillierten Änderungsbegründungen.',
      'nurKorrektur': 'Reine Korrektur von Rechtschreibung und Grammatik ohne inhaltliche Überarbeitung.',
      'kochbuch': 'Speziell für Rezepttexte: Formatierung, Reihenfolge und fachspezifische Regeln für Kochbücher.'
    };
    
    return descriptions[mode];
  };
  
  const getModeTitle = (mode: 'standard' | 'nurKorrektur' | 'kochbuch'): string => {
    const titles: Record<string, string> = {
      'standard': 'Standard',
      'nurKorrektur': 'Nur Korrektorat',
      'kochbuch': 'Kochbuch'
    };
    
    return titles[mode];
  };
  
  return (
    <div className="space-y-6">
      <div className="document-info">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-gnb-primary mt-0.5 flex-shrink-0" />
          <p>Laden Sie ein Word-Dokument hoch für ein umfassendes Lektorat mit inhaltlicher und sprachlicher Analyse.</p>
        </div>
        
        <div className="mt-4">
          <h3 className="font-bold mb-2">Fokus des Lektorats:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="font-semibold">Inhaltliche Prüfung</p>
              <ul className="list-disc list-inside text-sm">
                <li>Struktur und logischer Aufbau</li>
                <li>Kohärenz der Argumentation</li>
                <li>Nachvollziehbarkeit</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Sprachliche Überarbeitung</p>
              <ul className="list-disc list-inside text-sm">
                <li>Stiloptimierung</li>
                <li>Vielfältige Wortwahl</li>
                <li>Konsistenz in Ton und Perspektive</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-2 font-medium">Lektorat-Modus:</label>
          <div className="relative">
            <button 
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              disabled={disabled}
              className="w-full flex justify-between items-center py-2 px-4 border bg-background rounded-lg hover:bg-muted transition-colors"
            >
              <span>{getModeTitle(activeMode)}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showModeDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg">
                <ul>
                  <li>
                    <button 
                      className={`w-full text-left px-4 py-2 hover:bg-muted transition-colors ${activeMode === 'standard' ? 'bg-muted/50' : ''}`}
                      onClick={() => handleModeChange('standard')}
                    >
                      Standard
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`w-full text-left px-4 py-2 hover:bg-muted transition-colors ${activeMode === 'nurKorrektur' ? 'bg-muted/50' : ''}`}
                      onClick={() => handleModeChange('nurKorrektur')}
                    >
                      Nur Korrektorat
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`w-full text-left px-4 py-2 hover:bg-muted transition-colors ${activeMode === 'kochbuch' ? 'bg-muted/50' : ''}`}
                      onClick={() => handleModeChange('kochbuch')}
                    >
                      Kochbuch
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {getModeDescription(activeMode)}
          </p>
        </div>
        
        <div>
          <label htmlFor="llm-selector" className="block mb-2 font-medium">OpenAI-Modell auswählen:</label>
          <select 
            id="llm-selector" 
            className="w-full p-2 border rounded-lg bg-background"
            onChange={handleModelChange}
            disabled={disabled}
            value={activeModel}
          >
            <option value="gpt-4o">GPT-4o (Empfohlen)</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="o3-mini">O3 Mini</option>
          </select>
          <p className="text-sm text-muted-foreground mt-1">
            {getModelDescription(activeModel)}
          </p>
        </div>
      </div>
      
      <div>
        <div className="flex items-center justify-between">
          <button 
            type="button"
            className="text-gnb-primary text-sm font-medium flex items-center gap-1"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          >
            {showAdvancedSettings ? 'Erweiterte Einstellungen ausblenden' : 'Erweiterte Einstellungen anzeigen'}
          </button>
        </div>
        
        {showAdvancedSettings && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/30">
            <label htmlFor="systemMessage" className="block text-sm font-medium mb-1">
              System-Prompt:
            </label>
            <textarea
              id="systemMessage"
              value={systemMessage}
              onChange={handleSystemMessageChange}
              className="w-full p-2 border rounded h-32 text-sm font-mono"
              disabled={disabled}
              placeholder="Du bist ein professioneller Lektor und hilfst dabei, Texte zu verbessern..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Dieser Prompt bestimmt, wie das KI-Modell den Text bearbeiten soll. 
              Die Ausgabe sollte immer mit "LEKTORIERTER TEXT:" und "ÄNDERUNGEN:" formatiert sein.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditingTools;
