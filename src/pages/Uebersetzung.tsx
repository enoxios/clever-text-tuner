
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import UploadZone from '@/components/UploadZone';
import DocumentStats from '@/components/DocumentStats';
import LanguageSelector from '@/components/LanguageSelector';
import TextEditor from '@/components/TextEditor';
import TranslationResultView from '@/components/TranslationResultView';
import GlossaryUpload from '@/components/GlossaryUpload';
import { Loader2 } from 'lucide-react';
import { 
  extractTextFromDocx, 
  calculateDocumentStats,
  removeMarkdown,
  type DocumentStats as DocumentStatsType,
  type TextChunk,
  splitDocumentIntoChunks,
  mergeProcessedChunks,
  MAX_CHUNK_SIZE
} from '@/utils/documentUtils';
import { translateText, processTranslationChunks } from '@/utils/translationUtils';

interface GlossaryEntry {
  term: string;
  explanation: string;
}

const UebersetzungPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [documentText, setDocumentText] = useState<string>('');
  const [originalText, setOriginalText] = useState<string>('');
  const [documentStats, setDocumentStats] = useState<DocumentStatsType>({
    charCount: 0,
    wordCount: 0,
    status: 'acceptable',
    statusText: 'Akzeptable Länge'
  });
  
  const [translationStyle, setTranslationStyle] = useState<'standard' | 'literary' | 'technical'>('standard');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-5-2025-08-07');
  const [sourceLanguage, setSourceLanguage] = useState<string>('auto');
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [notes, setNotes] = useState<{text: string; isCategory: boolean}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);
  const [hasStoredKey, setHasStoredKey] = useState<boolean>(false);
  const [glossaryEntries, setGlossaryEntries] = useState<GlossaryEntry[]>([]);
  
  const [isLargeDocument, setIsLargeDocument] = useState<boolean>(false);
  const [textChunks, setTextChunks] = useState<TextChunk[]>([]);
  const [chunkProgress, setChunkProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });

  // Load stored API key on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('gnb-openai-api-key');
    if (storedKey) {
      setApiKey(storedKey);
      setHasStoredKey(true);
      setShowApiKeyInput(false);
    }
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setProgress(10);
    
    try {
      const text = await extractTextFromDocx(selectedFile);
      setProgress(50);
      
      setDocumentText(text);
      setOriginalText(text);
      const stats = calculateDocumentStats(text);
      setDocumentStats(stats);
      
      const needsChunking = text.length > MAX_CHUNK_SIZE;
      setIsLargeDocument(needsChunking);
      
      if (needsChunking) {
        const chunks = splitDocumentIntoChunks(text);
        setTextChunks(chunks);
        toast.info(`Großes Dokument erkannt: Wird in ${chunks.length} Teile aufgeteilt`);
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
      setTranslatedText('');
      setNotes([]);
      setError(null);
    }
    
    // Don't clear API key on file removal - keep it stored
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

  const handleStyleChange = (style: 'standard' | 'literary' | 'technical') => {
    console.log('Style changed to:', style);
    setTranslationStyle(style);
  };

  const handleModelChange = (model: string) => {
    console.log('Model changed to:', model);
    setSelectedModel(model);
  };
  
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    if (!newKey.includes('Fehler')) {
      setApiKey(newKey);
    }
  };

  const saveApiKey = () => {
    if (apiKey.trim() && !apiKey.includes('Fehler')) {
      localStorage.setItem('gnb-openai-api-key', apiKey.trim());
      setHasStoredKey(true);
      setShowApiKeyInput(false);
      toast.success('API-Schlüssel erfolgreich gespeichert');
    } else {
      toast.error('Bitte geben Sie einen gültigen API-Schlüssel ein');
    }
  };

  const deleteStoredKey = () => {
    localStorage.removeItem('gnb-openai-api-key');
    setApiKey('');
    setHasStoredKey(false);
    setShowApiKeyInput(true);
    toast.info('Gespeicherter API-Schlüssel wurde gelöscht');
  };

  const processTranslation = async () => {
    if (!documentText.trim()) {
      toast.error('Kein Text zum Übersetzen vorhanden');
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
        toast.info(`Übersetzung in ${textChunks.length} Teilen gestartet`);
        setChunkProgress({ completed: 0, total: textChunks.length });
        
        const { processedChunks, allNotes } = await processTranslationChunks(
          textChunks,
          apiKey,
          translationStyle,
          sourceLanguage,
          targetLanguage,
          selectedModel,
          glossaryEntries,
          (completed, total) => {
            setChunkProgress({ completed, total });
            setProgress(Math.round((completed / total) * 100));
          }
        );
        
        const mergedText = mergeProcessedChunks(processedChunks);
        
        setTranslatedText(removeMarkdown(mergedText));
        setNotes(allNotes.flat());
        
        toast.success(`Übersetzung für alle ${textChunks.length} Teile abgeschlossen`);
      } else {
        const response = await translateText(
          documentText,
          apiKey,
          translationStyle,
          sourceLanguage,
          targetLanguage,
          selectedModel,
          glossaryEntries
        );
        
        if (!response) {
          throw new Error('Keine Antwort von der API erhalten');
        }
        
        setTranslatedText(removeMarkdown(response.translatedText));
        setNotes(response.notes);
        
        toast.success('Text erfolgreich übersetzt');
      }
    } catch (err) {
      console.error('Error translating text:', err);
      setError(`Fehler beim Übersetzen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
      toast.error(`Übersetzung fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
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
        <h1 className="text-2xl md:text-3xl font-bold text-center">GNB KI-Übersetzung</h1>
      </div>
      
      <Navigation />
      
      <div className="space-y-8">
        <div className="card glass-card p-6 rounded-xl shadow-sm">
          <LanguageSelector 
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            onSourceLanguageChange={setSourceLanguage}
            onTargetLanguageChange={setTargetLanguage}
            onStyleChange={handleStyleChange}
            onModelChange={handleModelChange}
            initialStyle={translationStyle}
            disabled={isProcessing}
          />
          
          {showApiKeyInput && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/30">
              <label htmlFor="apiKey" className="block text-sm font-medium mb-1">
                OpenAI API-Schlüssel:
              </label>
              <div className="flex gap-2">
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  className="flex-1 p-2 border rounded"
                  placeholder="sk-..."
                />
                <button
                  onClick={saveApiKey}
                  className="px-4 py-2 bg-gnb-primary text-white rounded hover:bg-gnb-secondary transition-colors"
                >
                  Speichern
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ihr API-Schlüssel wird sicher lokal gespeichert und bei zukünftigen Besuchen automatisch geladen.
              </p>
            </div>
          )}

          {!showApiKeyInput && hasStoredKey && (
            <div className="mt-4 p-3 border rounded-lg bg-green-50 text-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">API-Schlüssel gespeichert:</span>
                  <code className="text-xs">sk-***...{apiKey.slice(-4)}</code>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowApiKeyInput(true)}
                    className="text-xs px-2 py-1 border border-green-600 rounded hover:bg-green-100 transition-colors"
                  >
                    Ändern
                  </button>
                  <button
                    onClick={deleteStoredKey}
                    className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Löschen
                  </button>
                </div>
              </div>
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
                  onClick={processTranslation}
                  disabled={!documentText.trim() || isProcessing}
                >
                  {isLargeDocument 
                    ? `Übersetzung für ${textChunks.length} Teile starten` 
                    : 'KI-Übersetzung starten'}
                </button>
                
                {!showApiKeyInput && !hasStoredKey && (
                  <button
                    className="bg-transparent hover:bg-muted text-gnb-primary py-2 px-4 border border-gnb-primary rounded-lg font-medium transition-colors"
                    onClick={() => setShowApiKeyInput(true)}
                  >
                    API-Schlüssel eingeben
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {showResults && (
          <div className="card glass-card p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Übersetzter Text</h2>
            <TranslationResultView 
              isLoading={isProcessing}
              originalText={originalText}
              translatedText={translatedText}
              notes={notes}
              error={error}
              fileName={fileName.replace(/\.docx$/, '') || 'uebersetzter-text'}
              sourceLang={sourceLanguage === 'auto' ? 'Erkannt' : sourceLanguage}
              targetLang={targetLanguage}
              chunkProgress={isLargeDocument ? chunkProgress : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default UebersetzungPage;
