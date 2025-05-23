
import { Document, Packer, Paragraph, TextRun, HeadingLevel, SectionType } from 'docx';
import { ChangeItem } from './documentTypes';

// Function to generate a Word document from lektorat results
// Updated to make including changes optional
export const generateWordDocument = async (
  editedText: string, 
  changes: ChangeItem[],
  includeChanges: boolean = false
): Promise<Blob> => {
  // Preserve paragraph formatting by splitting on double line breaks
  const textParagraphs = editedText.split('\n\n').map(paragraph => {
    // Handle single line breaks inside paragraphs (preserve formatting)
    if (paragraph.includes('\n')) {
      const lines = paragraph.split('\n');
      return new Paragraph({
        children: lines.flatMap((line, i) => [
          new TextRun(line),
          i < lines.length - 1 ? new TextRun({ text: "", break: 1 }) : []
        ].flat()),
      });
    } else {
      return new Paragraph({
        children: [new TextRun(paragraph)],
      });
    }
  });

  const sections = [];
  
  // Always include the text paragraphs
  sections.push({
    properties: {
      type: SectionType.CONTINUOUS,
    },
    children: [
      ...textParagraphs,
    ],
  });

  // Only include changes if specified
  if (includeChanges) {
    const changeParagraphs: Paragraph[] = [];
    let currentCategory = '';

    if (changes.length > 0) {
      changeParagraphs.push(
        new Paragraph({
          text: 'Vorgenommene Änderungen',
          heading: HeadingLevel.HEADING_1,
          spacing: {
            after: 200,
          },
        })
      );

      changes.forEach(change => {
        if (change.isCategory) {
          currentCategory = change.text;
          changeParagraphs.push(
            new Paragraph({
              text: currentCategory,
              heading: HeadingLevel.HEADING_2,
              spacing: {
                after: 200,
              },
            })
          );
        } else {
          changeParagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `• ${change.text}`,
                }),
              ],
              spacing: {
                after: 120,
              },
            })
          );
        }
      });

      sections[0].children.push(
        new Paragraph({
          children: [new TextRun({ text: '', break: 1 })],
        }),
        ...changeParagraphs
      );
    }
  }

  const doc = new Document({
    sections,
  });
  
  return Packer.toBlob(doc);
};

// Helper function to download the Word document
export const downloadWordDocument = async (
  editedText: string, 
  changes: ChangeItem[], 
  fileName = 'lektorierter-text',
  includeChanges: boolean = false
): Promise<void> => {
  try {
    const blob = await generateWordDocument(editedText, changes, includeChanges);
    
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.docx`;
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating Word document:', error);
    throw error;
  }
};
