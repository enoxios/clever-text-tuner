
import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  acceptedFileTypes?: string;
  maxFileSizeMB?: number;
}

const UploadZone = ({ 
  onFileSelect, 
  acceptedFileTypes = '.docx', 
  maxFileSizeMB = 10 
}: UploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (fileSizeMB > maxFileSizeMB) {
      setError(`Die Datei ist zu groß. Maximal ${maxFileSizeMB}MB erlaubt.`);
      return false;
    }
    
    return true;
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div 
        className={`upload-zone p-8 text-center ${isDragOver ? 'upload-zone-active' : ''}`}
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
          <Upload className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
        </div>
        
        <p className="mb-2">
          <span className="font-medium">Klicken Sie hier</span> oder ziehen Sie eine Word-Datei hierher
        </p>
        
        <p className="text-sm text-muted-foreground">
          Nur .docx Dateien werden unterstützt
        </p>
      </div>
      
      {error && (
        <div className="mt-2 text-sm text-destructive animate-fade-in">
          <div className="flex items-center">
            <X className="h-4 w-4 mr-1" />
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
