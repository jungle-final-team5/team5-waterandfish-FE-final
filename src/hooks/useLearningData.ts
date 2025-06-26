
import { useState } from 'react';
import { Category, Chapter, SignWord, QuizResult } from '@/types/learning';

// 샘플 데이터
const sampleCategories: Category[] = [
  {
    id: 'greetings',
    title: '일상 인사말',
    description: '기본적인 인사 표현을 배워보세요',
    icon: '👋',
    chapters: [
      {
        id: 'basic-greetings',
        title: '기본 인사',
        type: 'word',
        categoryId: 'greetings',
        signs: [
          { id: 'hello', word: '안녕하세요', category: 'greetings', difficulty: 'easy' },
          { id: 'goodbye', word: '안녕히가세요', category: 'greetings', difficulty: 'easy' },
          { id: 'thank-you', word: '감사합니다', category: 'greetings', difficulty: 'easy' },
          { id: 'sorry', word: '죄송합니다', category: 'greetings', difficulty: 'medium' },
          { id: 'nice-meet', word: '만나서 반갑습니다', category: 'greetings', difficulty: 'medium' }
        ]
      },
      {
        id: 'greeting-sentences',
        title: '인사 문장',
        type: 'sentence', 
        categoryId: 'greetings',
        signs: [
          { id: 'how-are-you', word: '어떻게 지내세요?', category: 'greetings', difficulty: 'medium' },
          { id: 'fine-thanks', word: '잘 지내고 있어요', category: 'greetings', difficulty: 'medium' },
          { id: 'see-you-later', word: '나중에 또 봐요', category: 'greetings', difficulty: 'hard' },
          { id: 'have-good-day', word: '좋은 하루 되세요', category: 'greetings', difficulty: 'hard' },
          { id: 'take-care', word: '몸조심하세요', category: 'greetings', difficulty: 'hard' }
        ]
      }
    ]
  },
  {
    id: 'emotions',
    title: '감정 표현',
    description: '다양한 감정을 수어로 표현해보세요',
    icon: '😊',
    chapters: [
      {
        id: 'basic-emotions',
        title: '기본 감정',
        type: 'word',
        categoryId: 'emotions',
        signs: [
          { id: 'happy', word: '기쁘다', category: 'emotions', difficulty: 'easy' },
          { id: 'sad', word: '슬프다', category: 'emotions', difficulty: 'easy' },
          { id: 'angry', word: '화나다', category: 'emotions', difficulty: 'easy' },
          { id: 'surprised', word: '놀라다', category: 'emotions', difficulty: 'medium' },
          { id: 'worried', word: '걱정하다', category: 'emotions', difficulty: 'medium' }
        ]
      }
    ]
  }
];

export const useLearningData = () => {
  const [categories] = useState<Category[]>(sampleCategories);
  const [reviewSigns, setReviewSigns] = useState<SignWord[]>([]);

  const getCategoryById = (id: string): Category | undefined => {
    return categories.find(cat => cat.id === id);
  };

  const getChapterById = (categoryId: string, chapterId: string): Chapter | undefined => {
    const category = getCategoryById(categoryId);
    return category?.chapters.find(chapter => chapter.id === chapterId);
  };

  const addToReview = (sign: SignWord) => {
    setReviewSigns(prev => {
      if (!prev.find(s => s.id === sign.id)) {
        return [...prev, sign];
      }
      return prev;
    });
  };

  const removeFromReview = (signId: string) => {
    setReviewSigns(prev => prev.filter(s => s.id !== signId));
  };

  return {
    categories,
    reviewSigns,
    getCategoryById,
    getChapterById,
    addToReview,
    removeFromReview
  };
};
