export type PatternType = 'numeric' | 'symbolic' | 'shape' | 'logical';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface Pattern {
  sequence: string;
  answer: string;
  type: PatternType;
  difficulty: DifficultyLevel;
  hint: string;
  explanation?: string;
}

export interface GeneratePatternOptions {
  type?: PatternType;
  difficulty?: DifficultyLevel;
  exclude?: string[];
  userId?: string;
}

export interface FeedbackState {
  message: string;
  type: 'success' | 'error' | null;
  explanation?: string;
}

export interface AIHint {
  hint: string;
  reasoning: string;
  confidence: number;
  tips?: string[];
  relatedConcepts?: string;
}

declare global {
  interface Window {
    MathJax: {
      typesetPromise?: () => Promise<void>;
    }
  }
}