
import { diffWords } from 'diff';

export interface TextDifference {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export const compareTexts = (oldText: string, newText: string): TextDifference[] => {
  return diffWords(oldText, newText);
};
