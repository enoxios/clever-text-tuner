
import { useState, useEffect } from 'react';
import { Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { ChangeItem } from '@/utils/documentUtils';

interface ResultViewProps {
  isLoading: boolean;
  editedText: string;
  changes: ChangeItem[];
  error: string | null;
}

const ResultView = ({ isLoading, editedText, changes, error }: ResultViewProps) => {
  const [activeTab, setActiveTab] = useState<'text' | 'changes'>('text');
  const [isCopied, setIsCopied] = useState(false);
  
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
          className={`py-2 px-4 font-medium border-b-2 transition-colors ${
            activeTab === 'text' ? 'border-gnb-primary' : 'border-transparent hover:border-gnb-primary/50'
          }`}
          onClick={() => setActiveTab('text')}
        >
          Lektorierter Text
        </button>
        <button 
          className={`py-2 px-4 font-medium border-b-2 transition-colors ${
            activeTab === 'changes' ? 'border-gnb-primary' : 'border-transparent hover:border-gnb-primary/50'
          }`}
          onClick={() => setActiveTab('changes')}
        >
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
      
      <div className={activeTab === 'changes' ? '' : 'hidden'}>
        <div className="changes-list">
          {changes.length === 0 ? (
            <p className="text-center py-4 italic text-muted-foreground">
              Keine Änderungen gefunden.
            </p>
          ) : (
            changes.map((item, index) => (
              item.isCategory ? (
                <div key={index} className="category-header">
                  {item.text}
                </div>
              ) : (
                <div key={index} className="change-item">
                  {item.text}
                </div>
              )
            ))
          )}
        </div>
      </div>
      
      <div className="mt-4 flex justify-end">
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
