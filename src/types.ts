export interface WordDetail {
  id: string;                 // Unique identifier
  word: string;               // Spelling, e.g. "challenge"
  phonetic: string;           // Phonetic symbol, e.g. "/ˈtʃæl.ɪndʒ/"
  translation: string;        // Chinese definition, e.g. "n. 挑战; 怀疑 v. 向…挑战"
  example: string;            // English example, e.g. "This task is a big challenge for us."
  exampleTranslation: string; // Chinese translation of example, e.g. "这项任务对我们来说是一个巨大的挑战。"
  addedAt: number;            // Timestamp
}

export interface WordList {
  id: string;                 // Unique identifier
  title: string;              // Name of list, e.g. "Extracted Word List"
  description?: string;       // Context, e.g., "From uploaded image"
  words: WordDetail[];        // Words in this list
  createdAt: number;          // Timestamp
}

export interface MistakeWord {
  word: string;               // Target word spelling
  detail: WordDetail;         // Detailed properties of the word
  wrongAttempts: number;      // Times misspelled
  lastAttemptAt: number;      // Timestamp of last failed try
  mastered: boolean;          // Mark as mastered to clear it
}

export interface DictationSession {
  listId: string | 'all-words' | 'mistakes'; // Source of dictation
  shuffledWords: WordDetail[];  // Shuffled sequence of words
  currentIndex: number;       // Current word index
  correctCount: number;       // Total correct
  incorrectCount: number;     // Total incorrect
  answers: {                  // History of responses in this turn
    wordId: string;
    userInput: string;
    isCorrect: boolean;
    timestamp: number;
  }[];
  isFinished: boolean;        // Done flag
}
