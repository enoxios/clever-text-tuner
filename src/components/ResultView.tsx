
import { useState, useEffect } from 'react';
import { Copy, CheckCircle2, AlertCircle, FileDown, List, FileText } from 'lucide-react';
import { ChangeItem, downloadWordDocument } from '@/utils/documentUtils';
import { compareTexts, type TextDifference } from '@/utils/compareUtils';

interface ResultViewProps {
  isLoading: boolean;
  originalText: string;
  editedText: string;
  changes: ChangeItem[];
  error: string | null;
  fileName?: string;
}

const ResultView = ({ 
  isLoading, 
  originalText, 
  editedText, 
  changes, 
  error, 
  fileName = 'lektorierter-text' 
}: ResultViewProps) => {
  const [activeTab, setActiveTab] = useState<'text' | 'changes' | 'comparison'>('text');
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [differences, setDifferences] = useState<TextDifference[]>([]);
  
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
      await downloadWordDocument(editedText, changes, fileName);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 animate-fade-in">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gnb-primary"></div>
        <span className="ml-3">Der Text wird lektoriert...</span>
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
      
      <div className="mt-4 flex justify-end gap-2">
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
              Als Word herunterladen
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
  );
};

export default ResultView;
