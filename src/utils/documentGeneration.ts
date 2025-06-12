import { Document, Packer, Paragraph, TextRun, HeadingLevel, SectionType } from 'docx';
import { ChangeItem } from './documentTypes';
import { compareTexts } from './compareUtils';

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

// New function to generate comparison document with tracked changes
export const generateComparisonDocument = async (
  originalText: string,
  editedText: string
): Promise<Blob> => {
  const differences = compareTexts(originalText, editedText);
  
  const paragraphs: Paragraph[] = [];
  
  // Add title
  paragraphs.push(
    new Paragraph({
      text: 'Textvergleich - Original vs. KI-Lektorat',
      heading: HeadingLevel.HEADING_1,
      spacing: {
        after: 400,
      },
    })
  );
  
  // Process differences and create paragraphs with tracked changes
  let currentParagraphRuns: TextRun[] = [];
  
  differences.forEach((diff, index) => {
    if (diff.added) {
      // Added text - mark as insertion by KI-Lektor
      currentParagraphRuns.push(
        new TextRun({
          text: diff.value,
          color: "008000", // Green color for additions
          underline: {},
        })
      );
    } else if (diff.removed) {
      // Removed text - mark as deletion
      currentParagraphRuns.push(
        new TextRun({
          text: diff.value,
          color: "FF0000", // Red color for deletions
          strike: true,
        })
      );
    } else {
      // Unchanged text
      currentParagraphRuns.push(
        new TextRun({
          text: diff.value,
        })
      );
    }
    
    // Check if we need to create a new paragraph (on double line breaks)
    if (diff.value.includes('\n\n')) {
      const parts = diff.value.split('\n\n');
      parts.forEach((part, partIndex) => {
        if (partIndex > 0) {
          // Create paragraph with current runs
          if (currentParagraphRuns.length > 0) {
            paragraphs.push(new Paragraph({ children: currentParagraphRuns }));
            currentParagraphRuns = [];
          }
        }
      });
    }
  });
  
  // Add any remaining runs as final paragraph
  if (currentParagraphRuns.length > 0) {
    paragraphs.push(new Paragraph({ children: currentParagraphRuns }));
  }
  
  // Add legend
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: '', break: 2 })],
    }),
    new Paragraph({
      text: 'Legende:',
      heading: HeadingLevel.HEADING_2,
      spacing: {
        after: 200,
      },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '• ',
        }),
        new TextRun({
          text: 'Grün unterstrichen',
          color: "008000",
          underline: {},
        }),
        new TextRun({
          text: ': Von KI-Lektor hinzugefügter Text',
        }),
      ],
      spacing: {
        after: 120,
      },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '• ',
        }),
        new TextRun({
          text: 'Rot durchgestrichen',
          color: "FF0000",
          strike: true,
        }),
        new TextRun({
          text: ': Von KI-Lektor entfernter Text',
        }),
      ],
      spacing: {
        after: 120,
      },
    })
  );

  const doc = new Document({
    sections: [{
      properties: {
        type: SectionType.CONTINUOUS,
      },
      children: paragraphs,
    }],
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

// Helper function to download comparison document
export const downloadComparisonDocument = async (
  originalText: string,
  editedText: string,
  fileName = 'textvergleich'
): Promise<void> => {
  try {
    const blob = await generateComparisonDocument(originalText, editedText);
    
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.docx`;
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating comparison document:', error);
    throw error;
  }
};
