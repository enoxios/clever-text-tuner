import { useState, useEffect } from 'react';
import { Copy, CheckCircle2, AlertCircle, FileDown, List, FileText, GitCompare } from 'lucide-react';
import { ChangeItem, downloadWordDocument, downloadComparisonDocument } from '@/utils/documentUtils';
import { compareTexts, type TextDifference } from '@/utils/compareUtils';

interface ResultViewProps {
  isLoading: boolean;
  originalText: string;
  editedText: string;
  changes: ChangeItem[];
  error: string | null;
  fileName?: string;
  chunkProgress?: { completed: number; total: number };
}

const ResultView = ({ 
  isLoading, 
  originalText, 
  editedText, 
  changes, 
  error, 
  fileName = 'lektorierter-text',
  chunkProgress
}: ResultViewProps) => {
  const [activeTab, setActiveTab] = useState<'text' | 'changes' | 'comparison'>('text');
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingComparison, setIsDownloadingComparison] = useState(false);
  const [differences, setDifferences] = useState<TextDifference[]>([]);
  const [includeChanges, setIncludeChanges] = useState(false);
  
  useEffect(() => {
    if (originalText && editedText) {
      const diffs = compareTexts(originalText, editedText);
      setDifferences(diffs);
    }
  }, [originalText, editedText]);
  
  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => {
        setIsCopied(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isCopied]);
  
  const handleCopyText = () => {
    navigator.clipboard.writeText(editedText);
    setIsCopied(true);
  };
  
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await downloadWordDocument(editedText, changes, fileName, includeChanges);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handleComparisonDownload = async () => {
    try {
      setIsDownloadingComparison(true);
      await downloadComparisonDocument(originalText, editedText, `${fileName}-vergleich`, includeChanges, changes);
    } catch (err) {
      console.error('Comparison download error:', err);
    } finally {
      setIsDownloadingComparison(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gnb-primary mb-4"></div>
        <span className="text-center">Der Text wird lektoriert...</span>
        
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
            <p className="font-medium">Fehler beim Lektorieren</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="animate-fade-in">
      <div className="flex border-b mb-4">
        <button 
          className={`py-2 px-4 font-medium border-b-2 transition-colors flex items-center ${
            activeTab === 'text' ? 'border-gnb-primary' : 'border-transparent hover:border-gnb-primary/50'
          }`}
          onClick={() => setActiveTab('text')}
        >
          <FileText className="h-4 w-4 mr-2" />
          Lektorierter Text
        </button>
        <button 
          className={`py-2 px-4 font-medium border-b-2 transition-colors flex items-center ${
            activeTab === 'comparison' ? 'border-gnb-primary' : 'border-transparent hover:border-gnb-primary/50'
          }`}
          onClick={() => setActiveTab('comparison')}
        >
          <FileText className="h-4 w-4 mr-2" />
          Textvergleich
        </button>
        <button 
          className={`py-2 px-4 font-medium border-b-2 transition-colors flex items-center ${
            activeTab === 'changes' ? 'border-gnb-primary' : 'border-transparent hover:border-gnb-primary/50'
          }`}
          onClick={() => setActiveTab('changes')}
        >
          <List className="h-4 w-4 mr-2" />
          Änderungen
        </button>
      </div>
      
      <div className={activeTab === 'text' ? '' : 'hidden'}>
        <textarea
          rows={12}
          className="w-full p-3 border rounded-lg text-base bg-background resize-y"
          value={editedText}
          readOnly
        />
      </div>
      
      <div className={activeTab === 'comparison' ? '' : 'hidden'}>
        <div className="border rounded-lg p-3 h-[300px] overflow-auto bg-background">
          <div className="space-y-2">
            {differences.map((diff, index) => (
              <span 
                key={index} 
                className={`
                  ${diff.added ? 'bg-green-100 text-green-800' : ''} 
                  ${diff.removed ? 'bg-red-100 text-red-800 line-through' : ''}
                `}
              >
                {diff.value}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center text-sm space-x-4">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-red-100 mr-1"></span>
            <span className="text-muted-foreground">Gelöschter Text</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-green-100 mr-1"></span>
            <span className="text-muted-foreground">Hinzugefügter Text</span>
          </div>
        </div>
      </div>
      
      <div className={activeTab === 'changes' ? '' : 'hidden'}>
        <div className="border rounded-lg p-3 h-[300px] overflow-auto bg-background">
          {changes.length === 0 ? (
            <p className="text-center py-4 italic text-muted-foreground">
              Keine Änderungen gefunden.
            </p>
          ) : (
            <div className="space-y-3">
              {changes.map((item, index) => (
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
      
      <div className="mt-4 flex flex-col gap-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="includeChanges"
            checked={includeChanges}
            onChange={(e) => setIncludeChanges(e.target.checked)}
            className="mr-2 h-4 w-4"
          />
          <label htmlFor="includeChanges" className="text-sm">
            Änderungen im Dokument einschließen
          </label>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button 
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 bg-gnb-primary hover:bg-gnb-secondary text-white py-2 px-4 rounded-md font-medium transition-colors"
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
                Lektorierter Text (.DOCX)
              </>
            )}
          </button>

          <button 
            onClick={handleComparisonDownload}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
            disabled={isDownloadingComparison}
          >
            {isDownloadingComparison ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Wird heruntergeladen...
              </>
            ) : (
              <>
                <GitCompare className="h-4 w-4" />
                Textvergleich (.DOCX)
              </>
            )}
          </button>
          
          <button 
            onClick={handleCopyText}
            className="flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground py-2 px-4 rounded-md font-medium transition-colors"
          >
            {isCopied ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Text kopiert!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Text kopieren
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultView;
