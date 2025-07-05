import { useState, useEffect } from 'react';
import API from '@/components/AxiosInstance';
import { Category, Chapter, Lesson, QuizResult } from '@/types/learning';

interface LearningProgress {
  completedSigns: Set<string>; // 완료된 실제 단어 목록
  completedChapters: Set<string>; // 완료된 챕터 목록
  completedCategories: Set<string>; // 완료된 카테고리 목록
}

export const useLearningData = () => {
  const [categories, setCategories] = useState<Category[]>([]); // 카테고리 목록
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [reviewSigns, setReviewSigns] = useState<Lesson[]>([]); // 리뷰 단어 목록
  const [progress, setProgress] = useState<LearningProgress>(() => { // 학습 진도 상태
    const saved = localStorage.getItem('learningProgress');
    if (saved) { // 저장된 학습 진도 데이터가 있으면
      const parsed = JSON.parse(saved); // 데이터 파싱
      return { // 학습 진도 상태 반환
        completedSigns: new Set(parsed.completedSigns || []),
        completedChapters: new Set(parsed.completedChapters || []),
        completedCategories: new Set(parsed.completedCategories || [])
      };
    }
    return { // 학습 진도 상태 초기화
      completedSigns: new Set(),
      completedChapters: new Set(),
      completedCategories: new Set()
    };
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await API.get<{ success: boolean; data: Category[]; message: string }>('/category');
        setCategories(response.data.data); // 카테고리 목록 설정
      } catch (error) {
        setCategories([]); // 카테고리 목록 초기화
      } finally {
        setLoading(false); // 로딩 상태 설정
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const progressData = { // 학습 진도 데이터
      completedSigns: Array.from(progress.completedSigns),
      completedChapters: Array.from(progress.completedChapters),
      completedCategories: Array.from(progress.completedCategories)
    };
    localStorage.setItem('learningProgress', JSON.stringify(progressData)); // 학습 진도 데이터 저장
  }, [progress]);

  const getCategoryById = (id: string): Category | undefined => { // 카테고리 아이디로 카테고리 가져오기
    return categories.find(cat => cat.id === id);
  };

  const getChapterById = async (chapterId: string): Promise<Chapter | undefined> => { // 챕터 아이디로 챕터 가져오기
    const response = await API.get<{ success: boolean; data: Chapter; message: string }>(`/chapters/${chapterId}`);
    if (response.data.success) {
      return response.data.data; // 챕터 데이터 반환
    }
    return undefined; // 챕터 데이터 없으면 undefined 반환
  };

  const addToReview = (sign: Lesson) => { // 리뷰 단어 추가
    setReviewSigns(prev => {
      if (!prev.find(s => s.id === sign.id)) {
        return [...prev, sign];
      }
      return prev;
    });
  };

  const removeFromReview = (signId: string) => {
    setReviewSigns(prev => prev.filter(s => s.id !== signId)); // 리뷰 단어 제거
  };

  const markSignCompleted = (signId: string) => {
    setProgress(prev => ({ // 실제 단어 완료 표시
      ...prev,
      completedSigns: new Set([...prev.completedSigns, signId])
    }));
  };

  const markChapterCompleted = (chapterId: string) => {
    setProgress(prev => ({ // 챕터 완료 표시
      ...prev,
      completedChapters: new Set([...prev.completedChapters, chapterId])
    }));
  };

  const markCategoryCompleted = (categoryId: string) => {
    setProgress(prev => ({ // 카테고리 완료 표시
      ...prev,
      completedCategories: new Set([...prev.completedCategories, categoryId])
    }));
  };

  const getChapterProgress = (chapter: Chapter): { completed: number; total: number; percentage: number } => {
    const completed = chapter.signs.filter(sign => progress.completedSigns.has(sign.id)).length; // 완료된 실제 단어 개수
    const total = chapter.signs.length; // 챕터 단어 개수
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0; // 완료율
    return { completed, total, percentage };
  };

  const getCategoryProgress = (category: Category): { completed: number; total: number; percentage: number } => {
    const allSigns = category.chapters.flatMap(chapter => chapter.signs); // 카테고리 챕터 단어 목록
    const completed = allSigns.filter(sign => progress.completedSigns.has(sign.id)).length; // 완료된 실제 단어 개수
    const total = allSigns.length; // 카테고리 단어 개수
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0; // 완료율
    return { completed, total, percentage };
  };

  const isChapterCompleted = (chapterId: string): boolean => {
    return progress.completedChapters.has(chapterId); // 챕터 완료 여부
  };

  const isCategoryCompleted = (categoryId: string): boolean => {
    return progress.completedCategories.has(categoryId); // 카테고리 완료 여부
  };

  // 관리자 기능들
  const addCategory = (categoryData: { title: string; description: string; icon: string },id: string) => {
    const newCategory: Category = { // 새 카테고리 생성
      id,
      ...categoryData,
      chapters: [],
      order_index: 0,
      emoji: "",
      total_chapters: 0
    };
    setCategories(prev => [...prev, newCategory]); // 카테고리 목록 업데이트
  };

  const updateCategory = (categoryId: string, categoryData: { title: string; description: string; icon: string }) => {
    setCategories(prev => prev.map(cat => // 카테고리 업데이트
      cat.id === categoryId 
        ? { ...cat, ...categoryData }
        : cat
    ));
  };

  const deleteCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== categoryId)); // 카테고리 삭제
  };

  const addChapter = (categoryId: string, chapterData: { title: string; type: 'word' | 'sentence'; signs: Lesson[] },cid : string) => {
    const newChapter: Chapter = {
      id: cid,
      ...chapterData,
      categoryId
    };
    setCategories(prev => prev.map(cat => // 챕터 추가
      cat.id === categoryId 
        ? { ...cat, chapters: [...cat.chapters, newChapter] }
        : cat
    ));
  };

  const updateChapter = (categoryId: string, chapterId: string, chapterData: { title: string; type: 'word' | 'sentence'; signs: Lesson[] }) => {
    setCategories(prev => prev.map(cat => // 챕터 업데이트
      cat.id === categoryId 
        ? {
            ...cat, 
            chapters: cat.chapters.map(chapter => 
              chapter.id === chapterId 
                ? { ...chapter, ...chapterData }
                : chapter
            )
          }
        : cat
    ));
  };

  const deleteChapter = (categoryId: string, chapterId: string) => {
    setCategories(prev => prev.map(cat => // 챕터 삭제
      cat.id === categoryId 
        ? { ...cat, chapters: cat.chapters.filter(chapter => chapter.id !== chapterId) }
        : cat
    ));
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
    isCategoryCompleted,
    addCategory,
    updateCategory,
    deleteCategory,
    addChapter,
    updateChapter,
    deleteChapter
  };
};