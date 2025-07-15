import { useState, useCallback } from 'react';
import { useNotifications } from './useNotifications';
import API from '@/components/AxiosInstance';

interface Badge {
  id: number;
  name: string;
  description: string;
  condition: (stats: LearningStats) => boolean;
  earned: boolean;
  earnedDate: string | null;
}

interface LearningStats {
  totalLessonsCompleted: number;
  consecutiveDays: number;
  correctAnswers: number;
  categoriesCompleted: number;
  chaptersCompleted: number;
  reviewsCompleted: number;
  fastAnswers: number;
}

export interface BadgeCheckResponse {
  earnedBadges: {
    id: number;
    name: string;
    description: string;
    earnedDate: string;
  }[];
  updatedStats?: Partial<LearningStats>;
}

export const useBadgeSystem = () => {
  const { showBadgeEarned } = useNotifications();
  const [loading, setLoading] = useState<boolean>(false);

  // API를 통해 뱃지 확인 및 획득
  const checkBadges = useCallback(async (action: string) => {
    setLoading(true);
    try {
    const response = await API.post<BadgeCheckResponse>('/badge/check-badges', {
      input_str: action // 또는 원하는 문자열 값
    });      
      
      return response.data;
    } catch (error) {
      console.error('Failed to check badges:', error);
      return { earnedBadges: [] };
    } finally {
      setLoading(false);
    }
  }, [showBadgeEarned]);

  return {
    checkBadges
  };
};