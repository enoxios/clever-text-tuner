
import { useState } from 'react';
import { Info } from 'lucide-react';

interface EditingToolsProps {
  onModeChange: (mode: 'standard' | 'nurKorrektur') => void;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

const EditingTools = ({ 
  onModeChange, 
  onModelChange, 
  disabled = false 
}: EditingToolsProps) => {
  const [activeMode, setActiveMode] = useState<'standard' | 'nurKorrektur'>('standard');
  const [activeModel, setActiveModel] = useState('gpt-4o');
  
  const handleModeChange = (mode: 'standard' | 'nurKorrektur') => {
    setActiveMode(mode);
    onModeChange(mode);
  };
  
  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveModel(event.target.value);
    onModelChange(event.target.value);
  };
  
  const getModelDescription = (model: string): string => {
    const descriptions: Record<string, string> = {
      'gpt-4o': 'Aktuellstes OpenAI-Modell mit höchster Qualität',
      'gpt-3.5-turbo': 'Schnellere Verarbeitung, etwas geringere Qualität',
      'gpt-4-turbo': 'Guter Kompromiss zwischen Qualität und Geschwindigkeit'
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
          <div className="mode-selector">
            <div 
              className={`mode-option ${activeMode === 'standard' ? 'active' : ''}`}
              onClick={() => !disabled && handleModeChange('standard')}
              style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
              Standard
            </div>
            <div 
              className={`mode-option ${activeMode === 'nurKorrektur' ? 'active' : ''}`}
              onClick={() => !disabled && handleModeChange('nurKorrektur')}
              style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
              Nur Korrektorat
            </div>
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
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
          <p className="text-sm text-muted-foreground mt-1">
            {getModelDescription(activeModel)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EditingTools;
