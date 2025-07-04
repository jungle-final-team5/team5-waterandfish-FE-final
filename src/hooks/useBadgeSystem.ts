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
  const [learningStats, setLearningStats] = useState<LearningStats>({
    totalLessonsCompleted: 0,
    consecutiveDays: 7,
    correctAnswers: 15,
    categoriesCompleted: 1,
    chaptersCompleted: 2,
    reviewsCompleted: 50,
    fastAnswers: 25
  });

  const badges: Badge[] = [
    {
      id: 1,
      name: "첫 학습 완료",
      description: "첫 번째 수어를 성공적으로 학습했습니다",
      condition: (stats) => stats.totalLessonsCompleted >= 1,
      earned: true,
      earnedDate: "2024-01-15"
    },
    {
      id: 2,
      name: "일주일 연속 학습",
      description: "7일 연속으로 학습을 완료했습니다",
      condition: (stats) => stats.consecutiveDays >= 7,
      earned: true,
      earnedDate: "2024-01-20"
    },
    {
      id: 3,
      name: "퀴즈 마스터",
      description: "퀴즈에서 10번 연속 정답을 맞혔습니다",
      condition: (stats) => stats.correctAnswers >= 10,
      earned: true,
      earnedDate: "2024-01-25"
    },
    {
      id: 4,
      name: "번개 학습자",
      description: "하루에 20개 이상의 수어를 학습했습니다",
      condition: (stats) => stats.totalLessonsCompleted >= 20,
      earned: true,
      earnedDate: "2024-01-18"
    },
    {
      id: 5,
      name: "복습 마스터",
      description: "복습 기능을 50회 사용했습니다",
      condition: (stats) => stats.reviewsCompleted >= 50,
      earned: true,
      earnedDate: "2024-02-05"
    }
  ];

  // API를 통해 뱃지 확인 및 획득
  const checkBadgesWithAPI = useCallback(async (action: string) => {
    setLoading(true);
    try {
    const response = await API.post<BadgeCheckResponse>('/badge/check-badges', {
      input_str: action // 또는 원하는 문자열 값
    });      
      const { earnedBadges, updatedStats } = response.data;
      
      // 획득한 뱃지가 있으면 알림 표시
      if (earnedBadges && earnedBadges.length > 0) {
        earnedBadges.forEach(badge => {
          showBadgeEarned(badge.name, badge.description);
        });
      }
      
      // 통계 업데이트가 있으면 적용
      if (updatedStats) {
        setLearningStats(prev => ({ ...prev, ...updatedStats }));
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to check badges:', error);
      return { earnedBadges: [] };
    } finally {
      setLoading(false);
    }
  }, [showBadgeEarned]);

  const updateLearningProgress = useCallback((type: 'lesson' | 'chapter' | 'review' | 'fast_answer', amount: number = 1) => {
    checkBadgesWithAPI(type);
  }, [checkBadgesWithAPI]);

  return {
    badges,
    learningStats,
    updateLearningProgress,
    checkBadgesWithAPI,
    loading
  };
};