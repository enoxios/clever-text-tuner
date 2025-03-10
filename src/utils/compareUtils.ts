
import { diffWords } from 'diff';

export interface TextDifference {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export const compareTexts = (oldText: string, newText: string): TextDifference[] => {
  return diffWords(oldText, newText);
};

export const renderHighlightedDiff = (differences: TextDifference[]): JSX.Element[] => {
  return differences.map((part, index) => {
    if (part.added) {
      return <span key={index} className="bg-green-200 dark:bg-green-900">{part.value}</span>;
    }
    if (part.removed) {
      return <span key={index} className="bg-red-200 dark:bg-red-900 line-through">{part.value}</span>;
    }
    return <span key={index}>{part.value}</span>;
  });
};
