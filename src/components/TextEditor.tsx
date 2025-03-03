
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TextEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  disabled?: boolean;
}

const TextEditor = ({ text, onTextChange, disabled = false }: TextEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentText, setCurrentText] = useState(text);
  
  useEffect(() => {
    setCurrentText(text);
  }, [text]);
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentText(e.target.value);
    onTextChange(e.target.value);
  };
  
  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <details className="my-4" open={isOpen}>
      <summary 
        className="cursor-pointer font-medium flex items-center" 
        onClick={(e) => {
          e.preventDefault();
          toggleOpen();
        }}
      >
        <div className="flex items-center">
          {isOpen ? (
            <ChevronUp className="h-4 w-4 mr-1" />
          ) : (
            <ChevronDown className="h-4 w-4 mr-1" />
          )}
          Extrahierten Text anzeigen/bearbeiten
        </div>
      </summary>
      
      <div className={`mt-3 transition-all duration-300 ${isOpen ? 'animate-fade-in' : 'animate-fade-out hidden'}`}>
        <textarea
          rows={8}
          className="w-full p-3 border rounded-lg text-base mt-2 bg-background resize-y"
          placeholder="Der extrahierte Text erscheint hier..."
          value={currentText}
          onChange={handleTextChange}
          disabled={disabled}
        />
      </div>
    </details>
  );
};

export default TextEditor;
