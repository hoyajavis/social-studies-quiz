export interface Alternative {
  text: string;
  answer: string;
}

export interface Question {
  id: string;
  word: string;
  definition: string;
  category: string;
  example?: string;
  alternatives?: Alternative[];
}

export type QuizMode = 'spelling' | 'conceptual' | 'definition' | 'contextual';

export interface Progress {
  contextualUnlocked: boolean;
  conceptualUnlocked: boolean;
}

export interface QuizState {
  questions: Question[];
  currentIndex: number;
  score: number;
  answers: { questionId: string; answer: string; isCorrect: boolean }[];
  isFinished: boolean;
  mode: QuizMode;
  pickedAlternatives: number[];
}

export interface HighScore {
  date: string;
  score: number;
  total: number;
  mode: QuizMode;
}
