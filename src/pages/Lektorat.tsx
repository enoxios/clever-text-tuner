import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import UploadZone from '@/components/UploadZone';
import DocumentStats from '@/components/DocumentStats';
import EditingTools from '@/components/EditingTools';
import TextEditor from '@/components/TextEditor';
import ResultView from '@/components/ResultView';
import { 
  extractTextFromDocx, 
  calculateDocumentStats,
  processLektoratResponse,
  generatePrompt,
  removeMarkdown,
  type DocumentStats as DocumentStatsType,
  type ChangeItem
} from '@/utils/documentUtils';
import { callOpenAI } from '@/utils/openAIService';

const LektoratPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [documentText, setDocumentText] = useState<string>('');
  const [originalText, setOriginalText] = useState<string>(''); // Store original text for comparison
  const [documentStats, setDocumentStats] = useState<DocumentStatsType>({
    charCount: 0,
    wordCount: 0,
    status: 'acceptable',
    statusText: 'Akzeptable Länge'
  });
  
  const [editingMode, setEditingMode] = useState<'standard' | 'nurKorrektur'>('standard');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
  const [systemMessage, setSystemMessage] = useState<string>('Du bist ein professioneller Lektor und hilfst dabei, Texte zu verbessern. Strukturiere deine Antwort in zwei klar getrennte Teile: "LEKTORIERTER TEXT:" und "ÄNDERUNGEN:".');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>('');
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setProgress(10);
    
    try {
      const text = await extractTextFromDocx(selectedFile);
      setProgress(100);
      
      setDocumentText(text);
      setOriginalText(text); // Save original text
      const stats = calculateDocumentStats(text);
      setDocumentStats(stats);
      
      if (stats.status === 'warning' || stats.status === 'critical') {
        setEditingMode('nurKorrektur');
      }
      
      toast.success('Dokument erfolgreich geladen');
    } catch (err) {
      console.error('Error processing file:', err);
      toast.error('Fehler beim Verarbeiten der Datei');
      handleRemoveFile();
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileName('');
    setProgress(0);
    setDocumentText('');
    setOriginalText('');
    setDocumentStats({
      charCount: 0,
      wordCount: 0,
      status: 'acceptable',
      statusText: 'Akzeptable Länge'
    });
    
    if (showResults) {
      setShowResults(false);
      setEditedText('');
      setChanges([]);
      setError(null);
    }
  };

  const handleTextChange = (text: string) => {
    setDocumentText(text);
    setDocumentStats(calculateDocumentStats(text));
  };

  const handleModeChange = (mode: 'standard' | 'nurKorrektur') => {
    console.log('Mode changed to:', mode);
    setEditingMode(mode);
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
  };
  
  const handleSystemMessageChange = (message: string) => {
    setSystemMessage(message);
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
  };

  const processText = async () => {
    if (!documentText.trim()) {
      toast.error('Kein Text zum Lektorieren vorhanden');
      return;
    }

    if (!apiKey.trim()) {
      setShowApiKeyInput(true);
      toast.info('Bitte geben Sie Ihren OpenAI API-Schlüssel ein');
      return;
    }
    
    setIsProcessing(true);
    setShowResults(true);
    setError(null);
    
    try {
      const prompt = generatePrompt(documentText, editingMode, selectedModel);
      
      const apiResponse = await callOpenAI(prompt, apiKey, systemMessage);
      
      if (apiResponse) {
        const result = processLektoratResponse(`LEKTORIERTER TEXT:
${apiResponse.text}

ÄNDERUNGEN:
${apiResponse.changes}`);
        
        setEditedText(removeMarkdown(result.text));
        setChanges(result.changes);
      } else {
        setError('Keine Antwort von der API erhalten');
      }
    } catch (err) {
      console.error('Error processing text:', err);
      setError(`Ein Fehler ist beim Lektorieren aufgetreten: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen py-6 md:py-10 px-4 md:px-6 max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">GNB KI-Lektorat</h1>
      
      <div className="space-y-8">
        <div className="card glass-card p-6 rounded-xl shadow-sm">
          <EditingTools 
            onModeChange={handleModeChange} 
            onModelChange={handleModelChange}
            onSystemMessageChange={handleSystemMessageChange}
            defaultSystemMessage={systemMessage}
            initialMode={editingMode}
            disabled={isProcessing}
          />
          
          {showApiKeyInput && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/30">
              <label htmlFor="apiKey" className="block text-sm font-medium mb-1">
                OpenAI API-Schlüssel:
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={handleApiKeyChange}
                className="w-full p-2 border rounded"
                placeholder="sk-..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ihr API-Schlüssel wird nicht gespeichert und nur für die aktuelle Sitzung verwendet.
              </p>
            </div>
          )}
          
          {!file ? (
            <div className="mt-6">
              <UploadZone onFileSelect={handleFileSelect} />
            </div>
          ) : (
            <div className="mt-6">
              <DocumentStats 
                stats={documentStats}
                fileName={fileName}
                onRemoveFile={handleRemoveFile}
                progress={progress}
              />
              
              <TextEditor 
                text={documentText}
                onTextChange={handleTextChange}
                disabled={isProcessing}
              />
              
              <div className="flex gap-4 mt-4">
                <button
                  className="flex-1 bg-gnb-primary hover:bg-gnb-secondary text-white py-2 px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={processText}
                  disabled={!documentText.trim() || isProcessing}
                >
                  Text lektorieren
                </button>
                
                {!showApiKeyInput && (
                  <button
                    className="bg-transparent hover:bg-muted text-gnb-primary py-2 px-4 border border-gnb-primary rounded-lg font-medium transition-colors"
                    onClick={() => setShowApiKeyInput(true)}
                  >
                    API-Schlüssel ändern
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {showResults && (
          <div className="card glass-card p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Lektorierter Text</h2>
            <ResultView 
              isLoading={isProcessing}
              originalText={originalText}
              editedText={editedText}
              changes={changes}
              error={error}
              fileName={fileName.replace(/\.docx$/, '') || 'lektorierter-text'}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LektoratPage;
