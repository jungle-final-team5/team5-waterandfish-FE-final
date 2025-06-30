import { useState, useEffect } from 'react';
import { Category, Chapter, SignWord, QuizResult } from '@/types/learning';
import API from '@/components/AxiosInstance';

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

interface LearningProgress {
  completedSigns: Set<string>;
  completedChapters: Set<string>;
  completedCategories: Set<string>;
}

export const useLearningData = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewSigns, setReviewSigns] = useState<SignWord[]>([]);
  const [progress, setProgress] = useState<LearningProgress>(() => {
    const saved = localStorage.getItem('learningProgress');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        completedSigns: new Set(parsed.completedSigns || []),
        completedChapters: new Set(parsed.completedChapters || []),
        completedCategories: new Set(parsed.completedCategories || [])
      };
    }
    return {
      completedSigns: new Set(['hello', 'goodbye', 'happy', 'sad']), // 샘플 데이터
      completedChapters: new Set(['basic-emotions']), // 샘플 데이터
      completedCategories: new Set(['emotions']) // 샘플 데이터
    };
  });

  // 백엔드에서 카테고리 데이터 가져오기
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        console.log('🔍 카테고리 데이터 요청 중...');
        const response = await API.get<Category[]>('/learning/categories');
        console.log('✅ 카테고리 데이터 받음:', response.data);
        setCategories(response.data);
      } catch (error) {
        console.error('❌ 카테고리 데이터 가져오기 실패:', error);
        // 에러 시 빈 배열로 설정
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const progressData = {
      completedSigns: Array.from(progress.completedSigns),
      completedChapters: Array.from(progress.completedChapters),
      completedCategories: Array.from(progress.completedCategories)
    };
    localStorage.setItem('learningProgress', JSON.stringify(progressData));
  }, [progress]);

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

  const markSignCompleted = (signId: string) => {
    setProgress(prev => ({
      ...prev,
      completedSigns: new Set([...prev.completedSigns, signId])
    }));
  };

  const markChapterCompleted = (chapterId: string) => {
    setProgress(prev => ({
      ...prev,
      completedChapters: new Set([...prev.completedChapters, chapterId])
    }));
  };

  const markCategoryCompleted = (categoryId: string) => {
    setProgress(prev => ({
      ...prev,
      completedCategories: new Set([...prev.completedCategories, categoryId])
    }));
  };

  const getChapterProgress = (chapter: Chapter): { completed: number; total: number; percentage: number } => {
    const completed = chapter.signs.filter(sign => progress.completedSigns.has(sign.id)).length;
    const total = chapter.signs.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const getCategoryProgress = (category: Category): { completed: number; total: number; percentage: number } => {
    const allSigns = category.chapters.flatMap(chapter => chapter.signs);
    const completed = allSigns.filter(sign => progress.completedSigns.has(sign.id)).length;
    const total = allSigns.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const isChapterCompleted = (chapterId: string): boolean => {
    return progress.completedChapters.has(chapterId);
  };

  const isCategoryCompleted = (categoryId: string): boolean => {
    return progress.completedCategories.has(categoryId);
  };

  return {
    categories,
    loading,
    reviewSigns,
    progress,
    getCategoryById,
    getChapterById,
    addToReview,
    removeFromReview,
    markSignCompleted,
    markChapterCompleted,
    markCategoryCompleted,
    getChapterProgress,
    getCategoryProgress,
    isChapterCompleted,
    isCategoryCompleted
  };
};