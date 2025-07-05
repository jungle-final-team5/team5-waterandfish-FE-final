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
          setCategories([]);
        }
        setCategoriesError(null);
        setCategoriesLoading(false);
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
  };
};