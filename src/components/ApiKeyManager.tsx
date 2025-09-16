import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getRequiredApiKeyType } from '@/utils/aiServiceRouter';

interface ApiKeyManagerProps {
  selectedModel: string;
  onApiKeysChange: (openaiKey: string, claudeKey: string) => void;
  disabled?: boolean;
}

const ApiKeyManager = ({ selectedModel, onApiKeysChange, disabled = false }: ApiKeyManagerProps) => {
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [claudeApiKey, setClaudeApiKey] = useState<string>('');
  const [showOpenaiInput, setShowOpenaiInput] = useState<boolean>(false);
  const [showClaudeInput, setShowClaudeInput] = useState<boolean>(false);
  const [hasStoredOpenaiKey, setHasStoredOpenaiKey] = useState<boolean>(false);
  const [hasStoredClaudeKey, setHasStoredClaudeKey] = useState<boolean>(false);

  const requiredKeyType = getRequiredApiKeyType(selectedModel);

  // Load stored API keys on mount
  useEffect(() => {
    const storedOpenaiKey = localStorage.getItem('gnb-openai-api-key');
    const storedClaudeKey = localStorage.getItem('gnb-claude-api-key');
    
    if (storedOpenaiKey) {
      setOpenaiApiKey(storedOpenaiKey);
      setHasStoredOpenaiKey(true);
    }
    
    if (storedClaudeKey) {
      setClaudeApiKey(storedClaudeKey);
      setHasStoredClaudeKey(true);
    }
    
    onApiKeysChange(storedOpenaiKey || '', storedClaudeKey || '');
  }, [onApiKeysChange]);

  const handleOpenaiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    if (!newKey.includes('Fehler')) {
      setOpenaiApiKey(newKey);
      onApiKeysChange(newKey, claudeApiKey);
    }
  };

  const handleClaudeKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    if (!newKey.includes('Fehler')) {
      setClaudeApiKey(newKey);
      onApiKeysChange(openaiApiKey, newKey);
    }
  };

  const saveOpenaiKey = () => {
    if (openaiApiKey.trim() && !openaiApiKey.includes('Fehler')) {
      localStorage.setItem('gnb-openai-api-key', openaiApiKey.trim());
      setHasStoredOpenaiKey(true);
      setShowOpenaiInput(false);
      toast.success('OpenAI API-Schlüssel erfolgreich gespeichert');
      onApiKeysChange(openaiApiKey.trim(), claudeApiKey);
    } else {
      toast.error('Bitte geben Sie einen gültigen OpenAI API-Schlüssel ein');
    }
  };

  const saveClaudeKey = () => {
    if (claudeApiKey.trim() && !claudeApiKey.includes('Fehler')) {
      localStorage.setItem('gnb-claude-api-key', claudeApiKey.trim());
      setHasStoredClaudeKey(true);
      setShowClaudeInput(false);
      toast.success('Claude API-Schlüssel erfolgreich gespeichert');
      onApiKeysChange(openaiApiKey, claudeApiKey.trim());
    } else {
      toast.error('Bitte geben Sie einen gültigen Claude API-Schlüssel ein');
    }
  };

  const deleteOpenaiKey = () => {
    localStorage.removeItem('gnb-openai-api-key');
    setOpenaiApiKey('');
    setHasStoredOpenaiKey(false);
    setShowOpenaiInput(true);
    toast.info('Gespeicherter OpenAI API-Schlüssel wurde gelöscht');
    onApiKeysChange('', claudeApiKey);
  };

  const deleteClaudeKey = () => {
    localStorage.removeItem('gnb-claude-api-key');
    setClaudeApiKey('');
    setHasStoredClaudeKey(false);
    setShowClaudeInput(true);
    toast.info('Gespeicherter Claude API-Schlüssel wurde gelöscht');
    onApiKeysChange(openaiApiKey, '');
  };

  const needsOpenaiKey = requiredKeyType === 'openai' || selectedModel.startsWith('gpt-');
  const needsClaudeKey = requiredKeyType === 'claude' || selectedModel.startsWith('claude-');

  return (
    <div className="space-y-4">
      {/* OpenAI API Key Management */}
      {needsOpenaiKey && (
        <>
          {showOpenaiInput && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <label htmlFor="openaiApiKey" className="block text-sm font-medium mb-1">
                OpenAI API-Schlüssel:
              </label>
              <div className="flex gap-2">
                <input
                  id="openaiApiKey"
                  type="password"
                  value={openaiApiKey}
                  onChange={handleOpenaiKeyChange}
                  className="flex-1 p-2 border rounded"
                  placeholder="sk-..."
                  disabled={disabled}
                />
                <button
                  onClick={saveOpenaiKey}
                  disabled={disabled}
                  className="px-4 py-2 bg-gnb-primary text-white rounded hover:bg-gnb-secondary transition-colors disabled:opacity-50"
                >
                  Speichern
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ihr OpenAI API-Schlüssel wird sicher lokal gespeichert.
              </p>
            </div>
          )}

          {!showOpenaiInput && hasStoredOpenaiKey && (
            <div className="p-3 border rounded-lg bg-green-50 text-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">OpenAI API-Schlüssel:</span>
                  <code className="text-xs">sk-***...{openaiApiKey.slice(-4)}</code>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowOpenaiInput(true)}
                    disabled={disabled}
                    className="text-xs px-2 py-1 border border-green-600 rounded hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    Ändern
                  </button>
                  <button
                    onClick={deleteOpenaiKey}
                    disabled={disabled}
                    className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          )}

          {!hasStoredOpenaiKey && !showOpenaiInput && (
            <button
              onClick={() => setShowOpenaiInput(true)}
              disabled={disabled}
              className="w-full p-3 border-2 border-dashed border-gnb-primary text-gnb-primary rounded-lg hover:bg-gnb-primary/5 transition-colors disabled:opacity-50"
            >
              OpenAI API-Schlüssel eingeben
            </button>
          )}
        </>
      )}

      {/* Claude API Key Management */}
      {needsClaudeKey && (
        <>
          {showClaudeInput && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <label htmlFor="claudeApiKey" className="block text-sm font-medium mb-1">
                Claude API-Schlüssel:
              </label>
              <div className="flex gap-2">
                <input
                  id="claudeApiKey"
                  type="password"
                  value={claudeApiKey}
                  onChange={handleClaudeKeyChange}
                  className="flex-1 p-2 border rounded"
                  placeholder="sk-ant-..."
                  disabled={disabled}
                />
                <button
                  onClick={saveClaudeKey}
                  disabled={disabled}
                  className="px-4 py-2 bg-gnb-primary text-white rounded hover:bg-gnb-secondary transition-colors disabled:opacity-50"
                >
                  Speichern
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ihr Claude API-Schlüssel wird sicher lokal gespeichert.
              </p>
            </div>
          )}

          {!showClaudeInput && hasStoredClaudeKey && (
            <div className="p-3 border rounded-lg bg-blue-50 text-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Claude API-Schlüssel:</span>
                  <code className="text-xs">sk-ant-***...{claudeApiKey.slice(-4)}</code>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowClaudeInput(true)}
                    disabled={disabled}
                    className="text-xs px-2 py-1 border border-blue-600 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    Ändern
                  </button>
                  <button
                    onClick={deleteClaudeKey}
                    disabled={disabled}
                    className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          )}

          {!hasStoredClaudeKey && !showClaudeInput && (
            <button
              onClick={() => setShowClaudeInput(true)}
              disabled={disabled}
              className="w-full p-3 border-2 border-dashed border-gnb-primary text-gnb-primary rounded-lg hover:bg-gnb-primary/5 transition-colors disabled:opacity-50"
            >
              Claude API-Schlüssel eingeben
            </button>
          )}
        </>
      )}

      {/* Provider Information */}
      <div className="text-xs text-muted-foreground">
        {needsClaudeKey && (
          <p>
            <strong>Claude:</strong> Sehr stabile und zuverlässige Alternative zu GPT-5
          </p>
        )}
        {needsOpenaiKey && selectedModel.startsWith('gpt-5-') && (
          <p className="text-amber-600">
            <strong>Hinweis:</strong> GPT-5 ist aktuell instabil. Claude wird als Alternative empfohlen.
          </p>
        )}
      </div>
    </div>
  );
};

export default ApiKeyManager;