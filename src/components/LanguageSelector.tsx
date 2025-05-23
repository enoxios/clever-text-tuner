import { useState } from 'react';
import { Check, Languages, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LanguageSelectorProps {
  sourceLanguage: string;
  targetLanguage: string;
  onSourceLanguageChange: (language: string) => void;
  onTargetLanguageChange: (language: string) => void;
  onStyleChange: (style: 'standard' | 'literary' | 'technical') => void;
  onModelChange: (model: string) => void;
  initialStyle?: 'standard' | 'literary' | 'technical';
  disabled?: boolean;
}

// Common languages list
const languages = [
  { code: 'auto', name: 'Automatisch erkennen' },
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'Englisch' },
  { code: 'fr', name: 'Französisch' },
  { code: 'es', name: 'Spanisch' },
  { code: 'it', name: 'Italienisch' },
  { code: 'nl', name: 'Niederländisch' },
  { code: 'pl', name: 'Polnisch' },
  { code: 'ru', name: 'Russisch' },
  { code: 'zh', name: 'Chinesisch' },
  { code: 'ja', name: 'Japanisch' },
  { code: 'ar', name: 'Arabisch' },
  { code: 'pt', name: 'Portugiesisch' },
  { code: 'tr', name: 'Türkisch' },
];

// Translation style options
const styles = [
  { value: 'standard', label: 'Standard' },
  { value: 'literary', label: 'Literarisch' },
  { value: 'technical', label: 'Fachsprache' },
];

// Updated AI model options with corrected naming
const models = [
  { value: 'gpt-4o', label: 'GPT-4o (empfohlen)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini (schneller)' },
  { value: 'gpt-4.5-preview', label: 'GPT-4.5 Preview (leistungsstark)' },
  { value: 'gpt-4.1', label: 'GPT-4.1 (neues Modell)' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini (schneller)' },
];

const LanguageSelector = ({
  sourceLanguage,
  targetLanguage,
  onSourceLanguageChange,
  onTargetLanguageChange,
  onStyleChange,
  onModelChange,
  initialStyle = 'standard',
  disabled = false
}: LanguageSelectorProps) => {
  const [translationStyle, setTranslationStyle] = useState<string>(initialStyle);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

  const handleStyleChange = (value: string) => {
    setTranslationStyle(value);
    onStyleChange(value as 'standard' | 'literary' | 'technical');
  };

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    onModelChange(value);
  };

  // Find language names for selected codes
  const getLanguageName = (code: string) => {
    const lang = languages.find(lang => lang.code === code);
    return lang ? lang.name : code;
  };

  // Swap source and target languages
  const swapLanguages = () => {
    if (sourceLanguage !== 'auto') {
      const tempLang = sourceLanguage;
      onSourceLanguageChange(targetLanguage);
      onTargetLanguageChange(tempLang);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Ausgangssprache:</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled}>
              <Button variant="outline" className="w-full justify-between">
                <span>{getLanguageName(sourceLanguage)}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-80 overflow-y-auto">
              <DropdownMenuRadioGroup value={sourceLanguage} onValueChange={onSourceLanguageChange}>
                {languages.map((language) => (
                  <DropdownMenuRadioItem key={language.code} value={language.code}>
                    {language.name}
                    {sourceLanguage === language.code && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-end justify-center mb-1">
          <Button 
            size="icon"
            variant="ghost"
            onClick={swapLanguages}
            disabled={disabled || sourceLanguage === 'auto'}
            className="h-10 w-10"
            title="Sprachen tauschen"
          >
            <Languages className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Zielsprache:</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled}>
              <Button variant="outline" className="w-full justify-between">
                <span>{getLanguageName(targetLanguage)}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-80 overflow-y-auto">
              <DropdownMenuRadioGroup value={targetLanguage} onValueChange={onTargetLanguageChange}>
                {languages.filter(lang => lang.code !== 'auto').map((language) => (
                  <DropdownMenuRadioItem key={language.code} value={language.code}>
                    {language.name}
                    {targetLanguage === language.code && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div>
        <button
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="text-sm font-medium text-gnb-primary hover:underline flex items-center"
          disabled={disabled}
        >
          <ChevronDown className={`h-4 w-4 mr-1 transform transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
          {showAdvancedOptions ? 'Erweiterte Optionen ausblenden' : 'Erweiterte Optionen anzeigen'}
        </button>

        {showAdvancedOptions && (
          <div className="mt-4 space-y-4 p-4 border rounded-lg bg-muted/20">
            <div>
              <label className="block text-sm font-medium mb-1">Übersetzungsstil:</label>
              <div className="flex flex-wrap gap-2">
                {styles.map((style) => (
                  <Button
                    key={style.value}
                    variant={translationStyle === style.value ? 'default' : 'outline'}
                    onClick={() => handleStyleChange(style.value)}
                    disabled={disabled}
                    className="flex-1"
                  >
                    {style.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">KI-Modell:</label>
              <div className="flex flex-wrap gap-2">
                {models.map((model) => (
                  <Button
                    key={model.value}
                    variant={selectedModel === model.value ? 'default' : 'outline'}
                    onClick={() => handleModelChange(model.value)}
                    disabled={disabled}
                    className="flex-1"
                  >
                    {model.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageSelector;
