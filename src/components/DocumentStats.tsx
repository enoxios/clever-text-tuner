
import { AlertTriangle } from 'lucide-react';
import { DocumentStats as DocumentStatsType } from '@/utils/documentUtils';

interface DocumentStatsProps {
  stats: DocumentStatsType;
  fileName: string;
  onRemoveFile: () => void;
  progress: number;
}

const DocumentStats = ({
  stats,
  fileName,
  onRemoveFile,
  progress
}: DocumentStatsProps) => {
  const { charCount, wordCount, status, statusText } = stats;

  const formatNumber = (num: number): string => {
    return num.toLocaleString('de-DE');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center p-3 border rounded-lg">
        <div className="font-medium truncate pr-2">{fileName}</div>
        <button 
          onClick={onRemoveFile}
          className="text-destructive hover:text-destructive/80 transition-colors"
          aria-label="Remove file"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="p-4 border rounded-lg bg-background/50">
        <h3 className="font-semibold mb-3">Dokument-Statistik</h3>
        
        <div className="text-center mb-4 p-3 bg-muted rounded-lg">
          <span className="mr-2 font-medium">Dokumentlänge:</span>
          <span className="text-2xl font-bold text-gnb-primary">{formatNumber(charCount)}</span>
          <span className="ml-1">Zeichen</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="stat-item">
            <div className="text-sm text-muted-foreground">Wörter</div>
            <div className="text-xl font-semibold">{formatNumber(wordCount)}</div>
          </div>
          <div className="stat-item">
            <div className="text-sm text-muted-foreground">Status</div>
            <div className={`
              ${status === 'acceptable' ? 'text-green-500' : ''}
              ${status === 'warning' ? 'text-amber-500' : ''}
              ${status === 'critical' ? 'text-red-500' : ''}
            `}>
              {statusText}
            </div>
          </div>
        </div>
        
        {status !== 'acceptable' && (
          <div className="mt-3 p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg animate-fade-in">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Warnung: Risiko unvollständiger Antworten</p>
                <p className="text-sm mt-1">
                  Bei längeren Texten kann es zu Tokenlimit-Fehlern kommen. 
                  Wir empfehlen für dieses Dokument den "Nur Korrektorat"-Modus.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentStats;
