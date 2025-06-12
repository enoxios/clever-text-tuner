import { Document, Packer, Paragraph, TextRun, HeadingLevel, SectionType, CommentRangeStart, CommentRangeEnd, CommentReference } from 'docx';
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

// New function to generate comparison document with tracked changes as comments
export const generateComparisonDocument = async (
  originalText: string,
  editedText: string
): Promise<Blob> => {
  const differences = compareTexts(originalText, editedText);
  
  const comments: any[] = [];
  const paragraphs: Paragraph[] = [];
  let commentId = 0;
  
  // Add title
  paragraphs.push(
    new Paragraph({
      text: 'Textvergleich mit KI-Lektorat Kommentaren',
      heading: HeadingLevel.HEADING_1,
      spacing: {
        after: 400,
      },
    })
  );
  
  // Process differences and create paragraphs with comments for changes
  let currentParagraphRuns: any[] = [];
  
  differences.forEach((diff, index) => {
    if (diff.added) {
      // Added text - create comment for addition
      commentId++;
      const commentText = `KI-Lektor hat hinzugefügt: "${diff.value}"`;
      
      comments.push({
        id: commentId,
        author: "KI-Lektor",
        date: new Date(),
        children: [
          new Paragraph({
            children: [new TextRun(commentText)],
          }),
        ],
      });
      
      // Add the text with comment reference
      currentParagraphRuns.push(
        new CommentRangeStart(commentId),
        new TextRun({
          text: diff.value,
        }),
        new CommentRangeEnd(commentId),
        new CommentReference(commentId)
      );
    } else if (diff.removed) {
      // Removed text - create comment for deletion (don't show the deleted text in main content)
      commentId++;
      const commentText = `KI-Lektor hat gelöscht: "${diff.value}"`;
      
      comments.push({
        id: commentId,
        author: "KI-Lektor", 
        date: new Date(),
        children: [
          new Paragraph({
            children: [new TextRun(commentText)],
          }),
        ],
      });
      
      // Add a comment reference at the deletion point (no visible text)
      currentParagraphRuns.push(
        new CommentRangeStart(commentId),
        new CommentRangeEnd(commentId),
        new CommentReference(commentId)
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
  
  // Add explanation
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: '', break: 2 })],
    }),
    new Paragraph({
      text: 'Hinweise:',
      heading: HeadingLevel.HEADING_2,
      spacing: {
        after: 200,
      },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '• Der obige Text zeigt die finale, lektorierte Version.',
        }),
      ],
      spacing: {
        after: 120,
      },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '• Kommentare am rechten Rand zeigen die vorgenommenen Änderungen.',
        }),
      ],
      spacing: {
        after: 120,
      },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '• Alle Änderungen wurden vom KI-Lektor vorgenommen.',
        }),
      ],
      spacing: {
        after: 120,
      },
    })
  );

  const doc = new Document({
    comments: comments,
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
