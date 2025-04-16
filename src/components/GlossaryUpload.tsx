
import { useState } from 'react';
import { Upload, FileUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface GlossaryEntry {
  term: string;
  explanation: string;
}

interface GlossaryUploadProps {
  onGlossaryLoad: (entries: GlossaryEntry[]) => void;
}

const GlossaryUpload = ({ onGlossaryLoad }: GlossaryUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  const parseGlossaryFile = async (file: File) => {
    try {
      const text = await file.text();
      
      // Reset any previous format errors
      setFormatError(null);
      
      // Check if file is empty
      if (!text.trim()) {
        setFormatError('Die Datei ist leer');
        toast.error('Die Glossardatei ist leer');
        return;
      }
      
      // First, split by line
      const lines = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (lines.length === 0) {
        setFormatError('Die Datei enthält keine Textzeilen');
        toast.error('Die Glossardatei enthält keinen Text');
        return;
      }
      
      // Then check for the correct format (term: explanation)
      const entries: GlossaryEntry[] = [];
      const invalidLines: number[] = [];
      
      lines.forEach((line, index) => {
        // Check if line contains a colon
        if (!line.includes(':')) {
          invalidLines.push(index + 1);
          return;
        }
        
        const [term, ...explanationParts] = line.split(':');
        
        // Check if both term and explanation are present
        if (!term.trim() || !explanationParts.join(':').trim()) {
          invalidLines.push(index + 1);
          return;
        }
        
        entries.push({
          term: term.trim(),
          explanation: explanationParts.join(':').trim()
        });
      });

      // Display format errors if found
      if (invalidLines.length > 0) {
        const lineNumbers = invalidLines.length > 3 
          ? `${invalidLines.slice(0, 3).join(', ')} und ${invalidLines.length - 3} weitere` 
          : invalidLines.join(', ');
        
        setFormatError(`Ungültiges Format in Zeile(n): ${lineNumbers}. Format muss sein: "Begriff: Erklärung"`);
        
        if (entries.length === 0) {
          toast.error('Keine gültigen Glossareinträge gefunden');
          return;
        } else {
          toast.warning(`${invalidLines.length} ungültige Zeilen ignoriert, ${entries.length} gültige Einträge gefunden`);
        }
      }

      if (entries.length === 0) {
        setFormatError('Keine gültigen Glossareinträge gefunden. Format muss sein: "Begriff: Erklärung"');
        toast.error('Keine gültigen Glossareinträge gefunden');
        return;
      }

      onGlossaryLoad(entries);
      toast.success(`${entries.length} Glossareinträge erfolgreich geladen`);
      
    } catch (error) {
      console.error('Error parsing glossary:', error);
      setFormatError('Fehler beim Verarbeiten der Datei');
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        parseGlossaryFile(file);
      } else {
        toast.error('Bitte nur .txt Dateien hochladen');
      }
    }
  };

  return (
    <div className="space-y-4">
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
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Format: Begriff: Erklärung (ein Eintrag pro Zeile)
        </p>
        
        <label htmlFor="glossary-file-upload">
          <div className="inline-block">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              className="cursor-pointer"
              onClick={() => document.getElementById('glossary-file-upload')?.click()}
            >
              <FileUp className="h-4 w-4 mr-1" />
              Glossar hochladen
            </Button>
            <input
              id="glossary-file-upload"
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>
        </label>
      </div>
      
      {formatError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Formatfehler</AlertTitle>
          <AlertDescription>
            {formatError}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default GlossaryUpload;
