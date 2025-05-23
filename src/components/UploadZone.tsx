
import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X, FileWarning, FileCheck, AlertCircle, Clipboard } from 'lucide-react';
import { DocumentError } from '@/utils/documentUtils';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  onTextInput?: (text: string) => void;
  acceptedFileTypes?: string;
  maxFileSizeMB?: number;
  allowLargeFiles?: boolean;
}

const UploadZone = ({ 
  onFileSelect, 
  onTextInput,
  acceptedFileTypes = '.docx', 
  maxFileSizeMB = 10,
  allowLargeFiles = true
}: UploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const validateFile = (file: File): boolean => {
    setError(null);
    setErrorDetails(null);
    
    // Check file type
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!acceptedFileTypes.includes(fileExtension)) {
      setError(`Bitte nur ${acceptedFileTypes} Dateien hochladen.`);
      return false;
    }
    
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSizeMB && !allowLargeFiles) {
      setError(`Die Datei ist zu groß. Maximal ${maxFileSizeMB}MB erlaubt.`);
      return false;
    }

    // Check for empty files
    if (file.size === 0) {
      setError(`Die Datei ist leer oder beschädigt.`);
      return false;
    }
    
    return true;
  };

  const processFile = async (file: File) => {
    if (!validateFile(file)) {
      return;
    }

    try {
      setIsValidating(true);
      setError(null);
      setErrorDetails(null);
      
      // Pass the file to the parent component
      onFileSelect(file);
      
      setIsValidating(false);
    } catch (error) {
      console.error('Error validating file:', error);
      handleUploadError(error);
      setIsValidating(false);
    }
  };

  const handleUploadError = (error: unknown) => {
    // Basic error message
    let errorMessage = 'Die Datei konnte nicht verarbeitet werden.';
    let details = null;
    
    // Enhanced error handling for specific document errors
    if (error instanceof Error) {
      const docError = error as DocumentError;
      
      switch (docError.code) {
        case 'FILE_READ_ERROR':
          errorMessage = 'Die Datei konnte nicht gelesen werden. Bitte überprüfen Sie, ob die Datei geöffnet oder beschädigt ist.';
          break;
        case 'DOCUMENT_FORMAT_ERROR':
          errorMessage = 'Das Dokument enthält möglicherweise nicht unterstützte Elemente oder komplexe Formatierungen.';
          details = docError.details || null;
          break;
        case 'PROCESSING_ERROR':
          errorMessage = 'Fehler beim Verarbeiten des Dokuments.';
          details = docError.details || null;
          break;
        default:
          errorMessage = docError.message || errorMessage;
      }
    }
    
    setError(errorMessage);
    setErrorDetails(details);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const handleClick = () => {
    if (!showManualInput) {
      fileInputRef.current?.click();
    }
  };

  const handleManualTextSubmit = () => {
    if (!manualText.trim()) {
      toast.error('Bitte geben Sie einen Text ein');
      return;
    }
    
    if (onTextInput) {
      onTextInput(manualText);
      toast.success('Text erfolgreich übernommen');
      setManualText('');
      setShowManualInput(false);
    }
  };

  const toggleManualInput = () => {
    setShowManualInput(!showManualInput);
    setError(null);
    setErrorDetails(null);
  };

  return (
    <div className="w-full">
      {!showManualInput ? (
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
          } transition-colors cursor-pointer`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept={acceptedFileTypes}
            onChange={handleFileInputChange}
          />
          
          <div className="mb-4 flex justify-center">
            {isValidating ? (
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            ) : (
              <Upload className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
            )}
          </div>
          
          <p className="mb-2">
            <span className="font-medium">Klicken Sie hier</span> oder ziehen Sie eine Word-Datei hierher
          </p>
          
          <p className="text-sm text-muted-foreground">
            {allowLargeFiles ? 
              "Auch große Dokumente werden unterstützt und in Abschnitte von 2000 Wörtern aufgeteilt" : 
              `Nur .docx Dateien werden unterstützt (max. ${maxFileSizeMB}MB)`}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg p-6">
          <h3 className="font-medium mb-3 flex items-center">
            <Clipboard className="h-5 w-5 mr-2" />
            Text manuell eingeben
          </h3>
          <Textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Fügen Sie hier Ihren Text ein..."
            className="min-h-[200px] mb-4"
          />
          <div className="flex gap-2">
            <Button 
              onClick={handleManualTextSubmit} 
              className="bg-gnb-primary hover:bg-gnb-secondary"
            >
              Text verwenden
            </Button>
            <Button 
              variant="outline" 
              onClick={toggleManualInput}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-4">
          <div className="text-sm text-destructive bg-destructive/5 p-3 rounded-md">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
            
            {errorDetails && (
              <div className="text-xs ml-6 mt-1 text-muted-foreground">
                <details>
                  <summary className="cursor-pointer">Technische Details</summary>
                  <p className="mt-1 whitespace-pre-wrap">{errorDetails}</p>
                </details>
              </div>
            )}
            
            <div className="mt-4 flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs" 
                onClick={() => window.open('https://support.microsoft.com/de-de/office/reparieren-einer-besch%C3%A4digten-dokumentdatei-in-word-a6e329aa-1e93-4cad-9eda-c6903e573c7c', '_blank')}
              >
                Hilfe zur Dokumentreparatur
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={toggleManualInput}
              >
                {showManualInput ? "Zurück zum Upload" : "Text manuell eingeben"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
