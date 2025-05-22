

import { useState, useEffect } from 'react';
import { Copy, CheckCircle2, AlertCircle, FileDown, List, FileText } from 'lucide-react';
import { downloadTranslationDocument } from '@/utils/translationUtils';
import { compareTexts, type TextDifference } from '@/utils/compareUtils';

interface TranslationResultViewProps {
  isLoading: boolean;
  originalText: string;
  translatedText: string;
  notes: { text: string; isCategory: boolean; }[];
  error: string | null;
  fileName?: string;
  sourceLang: string;
  targetLang: string;
  chunkProgress?: { completed: number; total: number };
}

const TranslationResultView = ({ 
  isLoading, 
  originalText, 
  translatedText, 
  notes, 
  error, 
  fileName = 'uebersetzter-text',
  sourceLang,
  targetLang,
  chunkProgress
}: TranslationResultViewProps) => {
  const [activeTab, setActiveTab] = useState<'sideBySide' | 'translated' | 'notes'>('sideBySide');
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [differences, setDifferences] = useState<TextDifference[]>([]);
  const [includeOriginal, setIncludeOriginal] = useState(false);
  
  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => {
        setIsCopied(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isCopied]);
  
  const handleCopyText = () => {
    navigator.clipboard.writeText(translatedText);
    setIsCopied(true);
  };
  
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await downloadTranslationDocument(originalText, translatedText, notes, fileName, sourceLang, targetLang, includeOriginal);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gnb-primary mb-4"></div>
        <span className="text-center">Der Text wird übersetzt...</span>
        
        {chunkProgress && chunkProgress.total > 0 && (
          <div className="w-full max-w-md mt-4">
            <div className="text-sm text-center mb-2">
              Bearbeite Teil {chunkProgress.completed} von {chunkProgress.total}
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-gnb-primary h-2 rounded-full transition-all duration-300" 
                style={{ 
                  width: `${Math.max(5, (chunkProgress.completed / chunkProgress.total) * 100)}%` 
                }}
              ></div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg animate-fade-in">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Fehler beim Übersetzen</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="animate-fade-in">
      <div className="flex border-b mb-4 overflow-x-auto">
        <button 
          className={`py-2 px-4 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${
            activeTab === 'sideBySide' ? 'border-gnb-primary' : 'border-transparent hover:border-gnb-primary/50'
          }`}
          onClick={() => setActiveTab('sideBySide')}
        >
          <FileText className="h-4 w-4 mr-2" />
          Original und Übersetzung
        </button>
        <button 
          className={`py-2 px-4 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${
            activeTab === 'translated' ? 'border-gnb-primary' : 'border-transparent hover:border-gnb-primary/50'
          }`}
          onClick={() => setActiveTab('translated')}
        >
          <FileText className="h-4 w-4 mr-2" />
          Nur Übersetzung
        </button>
        <button 
          className={`py-2 px-4 font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${
            activeTab === 'notes' ? 'border-gnb-primary' : 'border-transparent hover:border-gnb-primary/50'
          }`}
          onClick={() => setActiveTab('notes')}
        >
          <List className="h-4 w-4 mr-2" />
          Anmerkungen
        </button>
      </div>
      
      <div className={activeTab === 'sideBySide' ? '' : 'hidden'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-1 flex items-center">
              <span>Original ({sourceLang})</span>
            </div>
            <textarea
              rows={10}
              className="w-full p-3 border rounded-lg text-base bg-background resize-y"
              value={originalText}
              readOnly
            />
          </div>
          <div>
            <div className="text-sm font-medium mb-1 flex items-center">
              <span>Übersetzung ({targetLang})</span>
            </div>
            <textarea
              rows={10}
              className="w-full p-3 border rounded-lg text-base bg-background resize-y"
              value={translatedText}
              readOnly
            />
          </div>
        </div>
      </div>
      
      <div className={activeTab === 'translated' ? '' : 'hidden'}>
        <textarea
          rows={12}
          className="w-full p-3 border rounded-lg text-base bg-background resize-y"
          value={translatedText}
          readOnly
        />
      </div>
      
      <div className={activeTab === 'notes' ? '' : 'hidden'}>
        <div className="border rounded-lg p-3 h-[300px] overflow-auto bg-background">
          {notes.length === 0 ? (
            <p className="text-center py-4 italic text-muted-foreground">
              Keine Anmerkungen zur Übersetzung vorhanden.
            </p>
          ) : (
            <div className="space-y-3">
              {notes.map((item, index) => (
                item.isCategory ? (
                  <div key={index} className="font-medium text-lg mt-4 text-gnb-primary border-b pb-1">
                    {item.text}
                  </div>
                ) : (
                  <div key={index} className="pl-4 border-l-2 border-muted py-1">
                    • {item.text}
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="includeOriginal"
            checked={includeOriginal}
            onChange={(e) => setIncludeOriginal(e.target.checked)}
            className="mr-2 h-4 w-4"
          />
          <label htmlFor="includeOriginal" className="text-sm">
            Originaltext im Dokument einschließen
          </label>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 bg-gnb-primary hover:bg-gnb-secondary text-white py-2 px-4 rounded-md font-medium transition-colors"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Wird heruntergeladen...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Als .DOCX Datei herunterladen
              </>
            )}
          </button>
          
          <button 
            onClick={handleCopyText}
            className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground py-2 px-4 rounded-md font-medium transition-colors"
          >
            {isCopied ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Übersetzung kopiert!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Übersetzung kopieren
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranslationResultView;

