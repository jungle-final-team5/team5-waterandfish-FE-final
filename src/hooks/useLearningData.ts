import { useState, useEffect } from 'react';
import API from '@/components/AxiosInstance';
import { Category, Chapter, Lesson } from '@/types/learning';

export const useLearningData = () => {
  // 카테고리만 먼저 불러오기 (최적화: /category/list 사용)
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // 챕터/수어는 필요할 때만 불러오기
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chaptersError, setChaptersError] = useState<string | null>(null);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState<string | null>(null);

  useEffect(() => {
    setCategoriesLoading(true);
    API.get<{ success: boolean; data: Category[]; message: string }>('/category/list')
      .then((res) => {
        if (res.data && Array.isArray(res.data.data)) {
          setCategories(res.data.data);
        } else {
          console.error('카테고리 파싱 실패: 응답 구조가 예상과 다름', res.data);
          setCategories([]);
        }
        setCategoriesError(null);
        setCategoriesLoading(false);
        console.log("catrgory is readyt");

      })
      .catch((err: unknown) => {
        setCategories([]);
        let msg = '카테고리 목록 불러오기 실패';
        const maybeMsg = (err as { message?: unknown }).message;
        if (typeof maybeMsg === 'string') {
          msg = maybeMsg;
        }
        setCategoriesError(msg);
        setCategoriesLoading(false);
        
      });
  }, []);

  // 챕터 fetch 함수 (카테고리별)
  const fetchChapters = async (categoryId: string) => {
    setChaptersLoading(true);
    setChaptersError(null);
    try {
      const res = await API.get<{ success: boolean; data: { chapters?: unknown }; message: string }>(`/category/${categoryId}/chapters`);
      if (res.data && res.data.data && Array.isArray(res.data.data.chapters)) {
        setChapters(res.data.data.chapters as Chapter[]);
      } else {
        setChapters([]);
      }
    } catch (err: unknown) {
      setChapters([]);
      let msg = '챕터 불러오기 실패';
      const maybeMsg = (err as { message?: unknown }).message;
      if (typeof maybeMsg === 'string') {
        msg = maybeMsg;
      }
      setChaptersError(msg);
    } finally {
      setChaptersLoading(false);
    }
  };

  // 레슨 fetch 함수 (챕터별)
  const fetchLessons = async (chapterId: string) => {
    setLessonsLoading(true);
    setLessonsError(null);
    try {
      const res = await API.get<{ success: boolean; data: unknown; message: string }>(`/chapter/${chapterId}/signs`);
      if (res.data && Array.isArray(res.data.data)) {
        setLessons(res.data.data as Lesson[]);
      } else {
        setLessons([]);
      }
    } catch (err: unknown) {
      setLessons([]);
      let msg = '레슨 불러오기 실패';
      const maybeMsg = (err as { message?: unknown }).message;
      if (typeof maybeMsg === 'string') {
        msg = maybeMsg;
      }
      setLessonsError(msg);
    } finally {
      setLessonsLoading(false);
    }
  };

  // 안전한 챕터 검색 함수
  const findChapterById = async (chapterId: string): Promise<Chapter | null> => {
    // 입력값 검증
    if (!chapterId || typeof chapterId !== 'string') {
      console.warn('findChapterById: Invalid chapterId provided');
      return null;
    }

    const res = await API.get<{ success: boolean; data: { chapter: Chapter }; message: string }>(`/chapters/${chapterId}`);
    console.log('chapter', res.data.data);
    return res.data.data.chapter || null;
  };

    // 챕터 내 레슨을 비롯한 모든 내용 가져오기
  const findHierarchyByChapterId = async (chapterId: string): Promise<any> => {
    // 입력값 검증
    if (!chapterId || typeof chapterId !== 'string') {
      console.warn('findLessonsByChapterId: Invalid chapterId provided');
      return null;
    }

    const res = await API.get<{ success: boolean; data: { chapter: Chapter }; message: string }>(`/chapters/${chapterId}/session`);
    
    console.log('lesson list!!', res.data);
    return res.data.data || null;
  }

  // 카테고리 ID로 카테고리 찾기
  const findCategoryById = (categoryId: string): Category | null => {

    if (!categoryId || typeof categoryId !== 'string') {
      console.warn('findCategoryById: Invalid categoryId provided');
      return null;
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      console.warn('findCategoryById: Categories not loaded or empty');
      return null;
    }

    try {
      const category = categories.find(cat => cat?.id === categoryId);
      console.log(category);
      return category;
    } catch (error) {
      console.error('findCategoryById: Error during search', error);
      return null;
    }
  };

  // 챕터ID로 카테고리 찾기 (챕터가 속한 카테고리)
  const findCategoryByChapterId = (chapterId: string): Category | null => {
    if (!chapterId || typeof chapterId !== 'string') {
      console.warn('findCategoryByChapterId: Invalid chapterId provided');
      return null;
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      console.warn('findCategoryByChapterId: Categories not loaded or empty');
      return null;
    }

    try {
      for (const category of categories) {
        if (!Array.isArray(category?.chapters)) {
          continue;
        }

        const hasChapter = category.chapters.some(chap => chap?.id === chapterId);
        if (hasChapter) {
          return category;
        }
      }

      console.warn(`findCategoryByChapterId: Category containing chapter '${chapterId}' not found`);
      return null;

    } catch (error) {
      console.error('findCategoryByChapterId: Error during search', error);
      return null;
    }
  };

  return {
    categories,
    categoriesLoading,
    categoriesError,
    chapters,
    chaptersLoading,
    chaptersError,
    lessons,
    lessonsLoading,
    lessonsError,
    fetchChapters,
    fetchLessons,
    // 새로운 안전한 검색 함수들
    findChapterById,
    findCategoryById,
    findCategoryByChapterId,
    findHierarchyByChapterId
  };
};