
import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';

interface GlossaryEntry {
  term: string;
  explanation: string;
}

interface GlossaryUploadProps {
  onGlossaryLoad: (entries: GlossaryEntry[]) => void;
}

const GlossaryUpload = ({ onGlossaryLoad }: GlossaryUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const parseGlossaryFile = async (file: File) => {
    try {
      const text = await file.text();
      // Erwarten Sie ein Format wie:
      // Begriff: Erklärung
      // Begriff2: Erklärung2
      const entries: GlossaryEntry[] = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.includes(':'))
        .map(line => {
          const [term, ...explanationParts] = line.split(':');
          return {
            term: term.trim(),
            explanation: explanationParts.join(':').trim()
          };
        });

      if (entries.length === 0) {
        throw new Error('Keine gültigen Glossareinträge gefunden');
      }

      onGlossaryLoad(entries);
      toast.success(`${entries.length} Glossareinträge erfolgreich geladen`);
    } catch (error) {
      console.error('Error parsing glossary:', error);
      toast.error('Fehler beim Verarbeiten der Glossardatei');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        parseGlossaryFile(file);
      } else {
        toast.error('Bitte nur .txt Dateien hochladen');
      }
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-4 text-center ${
        isDragOver ? 'border-primary bg-primary/5' : 'border-muted'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="mb-2">
        <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        Glossar als .txt Datei hier ablegen
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Format: Begriff: Erklärung (ein Eintrag pro Zeile)
      </p>
    </div>
  );
};

export default GlossaryUpload;
