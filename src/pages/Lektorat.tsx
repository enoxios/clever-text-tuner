
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
  const [selectedModel, setSelectedModel] = useState<string>('Claude-3.7-Sonnet');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>('');
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    setEditingMode(mode);
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
  };

  const processText = async () => {
    if (!documentText.trim()) {
      toast.error('Kein Text zum Lektorieren vorhanden');
      return;
    }
    
    setIsProcessing(true);
    setShowResults(true);
    setError(null);
    
    try {
      const prompt = generatePrompt(documentText, editingMode, selectedModel);
      
      setTimeout(() => {
        try {
          let simulatedResponse = '';
          
          if (editingMode === 'standard') {
            simulatedResponse = `LEKTORIERTER TEXT:
${documentText.replace(/ist/g, 'wird').replace(/und/g, 'sowie').replace(/aber/g, 'jedoch')}

ÄNDERUNGEN:
KATEGORIE: Struktur und Logik
- Absätze neu strukturiert für besseren Lesefluss.
- Argumentationskette in Abschnitt 2 verstärkt durch klarere Übergänge.

KATEGORIE: Stil
- Passive Konstruktionen durch aktive ersetzt für mehr Direktheit.
- Verschachtelte Sätze im dritten Teil vereinfacht für bessere Lesbarkeit.

KATEGORIE: Wortwahl
- "ist" durch "wird" ersetzt, um Dynamik zu steigern.
- "und" durch "sowie" ersetzt für sprachliche Vielfalt.
- "aber" durch "jedoch" ersetzt für formelleren Ton.

KATEGORIE: Ton und Perspektive
- Einheitliche Perspektive in der dritten Person sichergestellt.
- Konsistenten Formalitätsgrad über das gesamte Dokument gewahrt.`;
          } else {
            simulatedResponse = `LEKTORIERTER TEXT:
${documentText.replace(/daß/g, 'dass').replace(/muß/g, 'muss').replace(/blos/g, 'bloß')}

ÄNDERUNGEN:
KATEGORIE: Rechtschreibung und Grammatik
- "daß" durch "dass" ersetzt (neue Rechtschreibung).
- "muß" durch "muss" korrigiert (neue Rechtschreibung).
- "blos" zu "bloß" korrigiert (korrekte Schreibweise).`;
          }
          
          const result = processLektoratResponse(simulatedResponse);
          setEditedText(removeMarkdown(result.text));
          setChanges(result.changes);
          setIsProcessing(false);
          
        } catch (error) {
          console.error('Error processing text:', error);
          setError('Ein Fehler ist beim Verarbeiten des Textes aufgetreten.');
          setIsProcessing(false);
        }
      }, 3000);
      
    } catch (err) {
      console.error('Error processing text:', err);
      setError('Ein Fehler ist beim Lektorieren aufgetreten.');
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
            disabled={isProcessing}
          />
          
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
              
              <button
                className="w-full md:w-auto bg-gnb-primary hover:bg-gnb-secondary text-white py-2 px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                onClick={processText}
                disabled={!documentText.trim() || isProcessing}
              >
                Text lektorieren
              </button>
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
