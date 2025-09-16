import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getRequiredApiKeyType } from '@/utils/aiServiceRouter';
import { useApiKeys } from '@/hooks/useApiKeys';

interface ApiKeyManagerProps {
  selectedModel: string;
  onApiKeysChange: (openaiKey: string, claudeKey: string) => void;
  disabled?: boolean;
}

const ApiKeyManager = ({ selectedModel, onApiKeysChange, disabled = false }: ApiKeyManagerProps) => {
  const { apiKeys, loading: keysLoading, error, saveApiKeys, deleteApiKeys } = useApiKeys();
  const [showOpenaiInput, setShowOpenaiInput] = useState<boolean>(false);
  const [showClaudeInput, setShowClaudeInput] = useState<boolean>(false);
  const [openaiInputValue, setOpenaiInputValue] = useState<string>('');
  const [claudeInputValue, setClaudeInputValue] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const requiredKeyType = getRequiredApiKeyType(selectedModel);

  // Update parent component when keys change
  useEffect(() => {
    if (!keysLoading) {
      onApiKeysChange(apiKeys.openai_api_key || '', apiKeys.claude_api_key || '');
    }
  }, [apiKeys, keysLoading, onApiKeysChange]);

  // Show error toast when there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Initialize input values when editing existing keys
  useEffect(() => {
    if (showOpenaiInput && apiKeys.openai_api_key) {
      setOpenaiInputValue(apiKeys.openai_api_key);
    }
    if (showClaudeInput && apiKeys.claude_api_key) {
      setClaudeInputValue(apiKeys.claude_api_key);
    }
  }, [showOpenaiInput, showClaudeInput, apiKeys]);

  const handleOpenaiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    if (!newKey.includes('Fehler')) {
      setOpenaiInputValue(newKey);
    }
  };

  const handleClaudeKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    if (!newKey.includes('Fehler')) {
      setClaudeInputValue(newKey);
    }
  };

  const saveOpenaiKey = async () => {
    if (openaiInputValue.trim() && !openaiInputValue.includes('Fehler')) {
      setSaving(true);
      const success = await saveApiKeys(openaiInputValue.trim(), apiKeys.claude_api_key || '');
      if (success) {
        setShowOpenaiInput(false);
        toast.success('OpenAI API-Schlüssel erfolgreich gespeichert');
      }
      setSaving(false);
    } else {
      toast.error('Bitte geben Sie einen gültigen OpenAI API-Schlüssel ein');
    }
  };

  const saveClaudeKey = async () => {
    if (claudeInputValue.trim() && !claudeInputValue.includes('Fehler')) {
      setSaving(true);
      const success = await saveApiKeys(apiKeys.openai_api_key || '', claudeInputValue.trim());
      if (success) {
        setShowClaudeInput(false);
        toast.success('Claude API-Schlüssel erfolgreich gespeichert');
      }
      setSaving(false);
    } else {
      toast.error('Bitte geben Sie einen gültigen Claude API-Schlüssel ein');
    }
  };

  const deleteOpenaiKey = async () => {
    setSaving(true);
    const success = await saveApiKeys('', apiKeys.claude_api_key || '');
    if (success) {
      setShowOpenaiInput(true);
      setOpenaiInputValue('');
      toast.info('OpenAI API-Schlüssel wurde gelöscht');
    }
    setSaving(false);
  };

  const deleteClaudeKey = async () => {
    setSaving(true);
    const success = await saveApiKeys(apiKeys.openai_api_key || '', '');
    if (success) {
      setShowClaudeInput(true);
      setClaudeInputValue('');
      toast.info('Claude API-Schlüssel wurde gelöscht');
    }
    setSaving(false);
  };

  const needsOpenaiKey = requiredKeyType === 'openai' || selectedModel.startsWith('gpt-');
  const needsClaudeKey = requiredKeyType === 'claude' || selectedModel.startsWith('claude-');

  const hasStoredOpenaiKey = Boolean(apiKeys.openai_api_key);
  const hasStoredClaudeKey = Boolean(apiKeys.claude_api_key);

  if (keysLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">API-Schlüssel werden geladen...</span>
      </div>
    );
  }

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
                  value={openaiInputValue}
                  onChange={handleOpenaiKeyChange}
                  className="flex-1 p-2 border rounded"
                  placeholder="sk-..."
                  disabled={disabled || saving}
                />
                <button
                  onClick={saveOpenaiKey}
                  disabled={disabled || saving}
                  className="px-4 py-2 bg-gnb-primary text-white rounded hover:bg-gnb-secondary transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Speichern
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ihr OpenAI API-Schlüssel wird sicher in der Cloud gespeichert.
              </p>
            </div>
          )}

          {!showOpenaiInput && hasStoredOpenaiKey && (
            <div className="p-3 border rounded-lg bg-green-50 text-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">OpenAI API-Schlüssel:</span>
                  <code className="text-xs">sk-***...{apiKeys.openai_api_key?.slice(-4)}</code>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setOpenaiInputValue(apiKeys.openai_api_key || '');
                      setShowOpenaiInput(true);
                    }}
                    disabled={disabled || saving}
                    className="text-xs px-2 py-1 border border-green-600 rounded hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    Ändern
                  </button>
                  <button
                    onClick={deleteOpenaiKey}
                    disabled={disabled || saving}
                    className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {saving && <Loader2 className="h-3 w-3 animate-spin" />}
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
                  value={claudeInputValue}
                  onChange={handleClaudeKeyChange}
                  className="flex-1 p-2 border rounded"
                  placeholder="sk-ant-..."
                  disabled={disabled || saving}
                />
                <button
                  onClick={saveClaudeKey}
                  disabled={disabled || saving}
                  className="px-4 py-2 bg-gnb-primary text-white rounded hover:bg-gnb-secondary transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Speichern
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ihr Claude API-Schlüssel wird sicher in der Cloud gespeichert.
              </p>
            </div>
          )}

          {!showClaudeInput && hasStoredClaudeKey && (
            <div className="p-3 border rounded-lg bg-blue-50 text-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Claude API-Schlüssel:</span>
                  <code className="text-xs">sk-ant-***...{apiKeys.claude_api_key?.slice(-4)}</code>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setClaudeInputValue(apiKeys.claude_api_key || '');
                      setShowClaudeInput(true);
                    }}
                    disabled={disabled || saving}
                    className="text-xs px-2 py-1 border border-blue-600 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    Ändern
                  </button>
                  <button
                    onClick={deleteClaudeKey}
                    disabled={disabled || saving}
                    className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {saving && <Loader2 className="h-3 w-3 animate-spin" />}
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

      {/* Cloud Storage Info */}
      <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
        <p>
          <strong>✨ Neu:</strong> API-Schlüssel werden jetzt sicher in der Cloud gespeichert und sind auf allen Ihren Geräten verfügbar.
        </p>
      </div>
    </div>
  );
};

export default ApiKeyManager;