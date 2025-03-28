
import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';

interface EditingToolsProps {
  onModeChange: (mode: 'standard' | 'nurKorrektur') => void;
  onModelChange: (model: string) => void;
  onSystemMessageChange?: (message: string) => void;
  defaultSystemMessage?: string;
  initialMode?: 'standard' | 'nurKorrektur';
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
  const [activeMode, setActiveMode] = useState<'standard' | 'nurKorrektur'>(initialMode);
  const [activeModel, setActiveModel] = useState('gpt-4o');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [systemMessage, setSystemMessage] = useState(defaultSystemMessage);
  
  // Systemprompfs für die verschiedenen Modi
  const standardSystemMessage = 'Du bist ein professioneller Lektor und hilfst dabei, Texte zu verbessern. Führe ein umfassendes Lektorat mit inhaltlicher und sprachlicher Überarbeitung durch. Achte auf Struktur, Logik, Stil und Wortwahl. Strukturiere deine Antwort in zwei klar getrennte Teile: "LEKTORIERTER TEXT:" und "ÄNDERUNGEN:".';
  
  const nurKorrekturSystemMessage = 'Du bist ein professioneller Korrektor und hilfst dabei, Texte zu korrigieren. Korrigiere ausschließlich Rechtschreibung, Grammatik und Zeichensetzung, ohne den Stil oder Inhalt zu verändern. Strukturiere deine Antwort in zwei klar getrennte Teile: "LEKTORIERTER TEXT:" und "ÄNDERUNGEN:".';
  
  // Aktualisiere den Systemprompf, wenn sich der Modus ändert
  useEffect(() => {
    const newSystemMessage = activeMode === 'standard' ? standardSystemMessage : nurKorrekturSystemMessage;
    setSystemMessage(newSystemMessage);
    
    if (onSystemMessageChange) {
      onSystemMessageChange(newSystemMessage);
    }
  }, [activeMode, onSystemMessageChange]);
  
  const handleModeChange = (mode: 'standard' | 'nurKorrektur') => {
    if (disabled) return;
    
    setActiveMode(mode);
    onModeChange(mode);
    
    // Setze den entsprechenden Systemprompf
    const newSystemMessage = mode === 'standard' ? standardSystemMessage : nurKorrekturSystemMessage;
    setSystemMessage(newSystemMessage);
    
    if (onSystemMessageChange) {
      onSystemMessageChange(newSystemMessage);
    }
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
      'gpt-4.5': 'Neues GPT-4.5 Modell mit verbesserter Leistung'
    };
    
    return descriptions[model] || `${model}: Ausgewähltes KI-Modell für das Lektorat.`;
  };
  
  const getModeDescription = (mode: 'standard' | 'nurKorrektur'): string => {
    const descriptions: Record<string, string> = {
      'standard': 'Umfassende inhaltliche und sprachliche Überarbeitung mit detaillierten Änderungsbegründungen.',
      'nurKorrektur': 'Reine Korrektur von Rechtschreibung und Grammatik ohne inhaltliche Überarbeitung.'
    };
    
    return descriptions[mode];
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
          <div className="mode-selector flex space-x-2">
            <button 
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                activeMode === 'standard' 
                  ? 'bg-gnb-primary text-white' 
                  : 'bg-muted hover:bg-muted/80 text-foreground'
              }`}
              onClick={() => handleModeChange('standard')}
              disabled={disabled}
            >
              Standard
            </button>
            <button 
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                activeMode === 'nurKorrektur' 
                  ? 'bg-gnb-primary text-white' 
                  : 'bg-muted hover:bg-muted/80 text-foreground'
              }`}
              onClick={() => handleModeChange('nurKorrektur')}
              disabled={disabled}
            >
              Nur Korrektorat
            </button>
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
            <option value="gpt-4.5">GPT-4.5</option>
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
