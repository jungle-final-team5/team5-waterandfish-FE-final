export interface Lesson {
  id: string;
  word: string;
  category?: string;
  chapter_title?: string; // 챕터명 추가
  type?: 'letter' | 'word' | 'sentence';
  difficulty?: 'easy' | 'medium' | 'hard';
  videoUrl?: string;
  description?: string;
  status?: string; // "not_started" | "study" | "reviewed" | "quiz_wrong" 등
  modelInfo?: string;
  url?: string;
}

export interface Chapter {
  id: string;
  title: string;
  type: 'word' | 'sentence';
  lessons: Lesson[];
  categoryId: string;
  course_type: 'learn' | 'quiz';
  order_index: number;
  description: string;
}

export interface Category {
  id: string;
  title: string;
  description: string;
  chapters: Chapter[];
  icon: string;
  
  emoji: string;
  order_index: number;
  chapter_count?: number;
}

export interface QuizResult {
  signId: string;
  isCorrect: boolean;
  timeSpent: number;
  needsReview: boolean;
}

export interface LearningSession {
  id: string;
  categoryId: string;
  chapterId: string;
  type: 'learning' | 'quiz';
  completedSigns: string[];
  quizResults: QuizResult[];
  startTime: Date;
  endTime?: Date;
}
