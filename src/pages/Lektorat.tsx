import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import UploadZone from '@/components/UploadZone';
import DocumentStats from '@/components/DocumentStats';
import EditingTools from '@/components/EditingTools';
import TextEditor from '@/components/TextEditor';
import ResultView from '@/components/ResultView';
import GlossaryUpload from '@/components/GlossaryUpload';
import { 
  extractTextFromDocx, 
  calculateDocumentStats,
  processLektoratResponse,
  generatePrompt,
  removeMarkdown,
  type DocumentStats as DocumentStatsType,
  type ChangeItem,
  type TextChunk,
  splitDocumentIntoChunks,
  mergeProcessedChunks,
  mergeChanges,
  MAX_CHUNK_SIZE
} from '@/utils/documentUtils';
import { callOpenAI, processChunks } from '@/utils/openAIService';

interface GlossaryEntry {
  term: string;
  explanation: string;
}

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
  
  const [editingMode, setEditingMode] = useState<'standard' | 'nurKorrektur' | 'kochbuch'>('standard');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
  const [systemMessage, setSystemMessage] = useState<string>('Du bist ein professioneller Lektor und hilfst dabei, Texte zu verbessern. Strukturiere deine Antwort in zwei klar getrennte Teile: "LEKTORIERTER TEXT:" und "ÄNDERUNGEN:".');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>('');
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);
  const [glossaryEntries, setGlossaryEntries] = useState<GlossaryEntry[]>([]);
  
  const [isLargeDocument, setIsLargeDocument] = useState<boolean>(false);
  const [textChunks, setTextChunks] = useState<TextChunk[]>([]);
  const [chunkProgress, setChunkProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setProgress(10);
    
    try {
      const text = await extractTextFromDocx(selectedFile);
      setProgress(50);
      
      setDocumentText(text);
      setOriginalText(text); // Save original text
      const stats = calculateDocumentStats(text);
      setDocumentStats(stats);
      
      const needsChunking = text.length > MAX_CHUNK_SIZE;
      setIsLargeDocument(needsChunking);
      
      if (needsChunking) {
        const chunks = splitDocumentIntoChunks(text);
        setTextChunks(chunks);
        toast.info(`Großes Dokument erkannt: Wird in ${chunks.length} Teile aufgeteilt`);
      }
      
      if (stats.status === 'warning' || stats.status === 'critical') {
        setEditingMode('nurKorrektur');
      }
      
      setProgress(100);
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
    setIsLargeDocument(false);
    setTextChunks([]);
    setChunkProgress({ completed: 0, total: 0 });
    
    if (showResults) {
      setShowResults(false);
      setEditedText('');
      setChanges([]);
      setError(null);
    }
    
    setApiKey('');
  };

  const handleTextChange = (text: string) => {
    setDocumentText(text);
    setDocumentStats(calculateDocumentStats(text));
    
    const needsChunking = text.length > MAX_CHUNK_SIZE;
    setIsLargeDocument(needsChunking);
    
    if (needsChunking) {
      const chunks = splitDocumentIntoChunks(text);
      setTextChunks(chunks);
    } else {
      setTextChunks([]);
    }
  };

  const handleModeChange = (mode: 'standard' | 'nurKorrektur' | 'kochbuch') => {
    console.log('Mode changed to:', mode);
    setEditingMode(mode);
  };

  const handleModelChange = (model: string) => {
    console.log('Model changed to:', model);
    setSelectedModel(model);
  };
  
  const handleSystemMessageChange = (message: string) => {
    console.log('System message changed to:', message);
    setSystemMessage(message);
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    if (!newKey.includes('Fehler')) {
      setApiKey(newKey);
    }
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
    
    if (apiKey.includes('Fehler')) {
      toast.error('Ungültiger API-Schlüssel. Bitte geben Sie einen gültigen OpenAI API-Schlüssel ein');
      setShowApiKeyInput(true);
      setApiKey('');
      return;
    }
    
    setIsProcessing(true);
    setShowResults(true);
    setError(null);
    
    try {
      if (isLargeDocument && textChunks.length > 0) {
        toast.info(`Verarbeitung in ${textChunks.length} Teilen gestartet`);
        setChunkProgress({ completed: 0, total: textChunks.length });
        
        const { processedChunks, allChanges } = await processChunks(
          textChunks,
          apiKey,
          editingMode,
          selectedModel,
          systemMessage,
          glossaryEntries,
          (completed, total) => {
            setChunkProgress({ completed, total });
            setProgress(Math.round((completed / total) * 100));
          }
        );
        
        const mergedText = mergeProcessedChunks(processedChunks);
        const mergedChangeItems = mergeChanges(allChanges);
        
        setEditedText(removeMarkdown(mergedText));
        setChanges(mergedChangeItems);
        
        toast.success(`Lektorat für alle ${textChunks.length} Teile abgeschlossen`);
      } else {
        const prompt = generatePrompt(documentText, editingMode, selectedModel);
        console.log(`Starte Anfrage mit Modell: ${selectedModel}`);
        
        const apiResponse = await callOpenAI(
          prompt, 
          apiKey, 
          systemMessage, 
          selectedModel,
          glossaryEntries
        );
        
        if (!apiResponse) {
          throw new Error('Keine Antwort von der API erhalten');
        }
        
        const result = processLektoratResponse(`LEKTORIERTER TEXT:
${apiResponse.text}

ÄNDERUNGEN:
${apiResponse.changes}`);
        
        setEditedText(removeMarkdown(result.text));
        setChanges(result.changes);
        
        toast.success('Text erfolgreich lektoriert');
      }
    } catch (err) {
      console.error('Error processing text:', err);
      setError(`Fehler beim Lektorieren: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
      toast.error(`Lektorat fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsProcessing(false);
      setChunkProgress({ completed: 0, total: 0 });
    }
  };

  return (
    <div className="min-h-screen py-6 md:py-10 px-4 md:px-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-center gap-3 mb-8">
        <img 
          src="/lovable-uploads/de5492db-ff63-4dc7-9286-f72e78d8d16a.png" 
          alt="GNB Logo" 
          className="h-10 md:h-12" 
        />
        <h1 className="text-2xl md:text-3xl font-bold text-center">GNB KI-Lektorat</h1>
      </div>
      
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
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Optional: Glossar hochladen</h3>
                <GlossaryUpload onGlossaryLoad={setGlossaryEntries} />
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <DocumentStats 
                stats={documentStats}
                fileName={fileName}
                onRemoveFile={handleRemoveFile}
                progress={progress}
              />
              
              {isLargeDocument && (
                <div className="my-3 p-3 border rounded-lg bg-blue-50 text-blue-800">
                  <p className="text-sm font-medium">
                    Großes Dokument erkannt: Das Dokument wird in {textChunks.length} Teile aufgeteilt und nacheinander verarbeitet.
                  </p>
                  {chunkProgress.total > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-blue-600">
                        Bearbeite Teil {chunkProgress.completed} von {chunkProgress.total}
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(chunkProgress.completed / chunkProgress.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
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
                  {isLargeDocument 
                    ? `Lektorat für ${textChunks.length} Teile starten` 
                    : 'KI Lektorat starten'}
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
              chunkProgress={isLargeDocument ? chunkProgress : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LektoratPage;
