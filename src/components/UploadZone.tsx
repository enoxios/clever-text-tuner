
import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X, FileWarning, FileCheck } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  acceptedFileTypes?: string;
  maxFileSizeMB?: number;
  allowLargeFiles?: boolean;
}

const UploadZone = ({ 
  onFileSelect, 
  acceptedFileTypes = '.docx', 
  maxFileSizeMB = 10,
  allowLargeFiles = true
}: UploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
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
      
      // Pass the file to the parent component
      onFileSelect(file);
      
      setIsValidating(false);
    } catch (error) {
      console.error('Error validating file:', error);
      setError('Die Datei konnte nicht verarbeitet werden. Bitte versuchen Sie eine andere Datei.');
      setIsValidating(false);
    }
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
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
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
      
      {error && (
        <div className="mt-2 text-sm text-destructive animate-fade-in bg-destructive/5 p-2 rounded-md flex items-center">
          <FileWarning className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
