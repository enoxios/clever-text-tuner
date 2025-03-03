
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
  const [activeModel, setActiveModel] = useState('Claude-3.7-Sonnet');
  
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
      'Claude-3.7-Sonnet': 'Ausgewogene Balance zwischen Qualität und Geschwindigkeit.',
      'Gemini-2.0-Flash': 'Schnelles, effizientes Google-Modell für zeitkritische Anwendungen.',
      'GPT-4o': 'OpenAIs fortschrittlichstes multimodales Modell.',
      'Claude-3-Opus': 'Höchste Qualität, aber möglicherweise langsamer.',
      'Claude-3-Haiku': 'Schnellstes Claude-Modell, kompromissbereitere Qualität.'
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
          <label htmlFor="llm-selector" className="block mb-2 font-medium">KI-Modell auswählen:</label>
          <select 
            id="llm-selector" 
            className="w-full p-2 border rounded-lg bg-background"
            onChange={handleModelChange}
            disabled={disabled}
            value={activeModel}
          >
            <option value="Claude-3.7-Sonnet">Claude 3.7 Sonnet (Empfohlen)</option>
            <option value="Gemini-2.0-Flash">Gemini 2.0 Flash</option>
            <option value="GPT-4o">GPT-4o</option>
            <option value="Claude-3-Opus">Claude 3 Opus</option>
            <option value="Claude-3-Haiku">Claude 3 Haiku</option>
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
