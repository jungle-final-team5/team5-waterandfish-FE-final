
import { useState, useCallback } from 'react';
import { useNotifications } from './useNotifications';

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

export const useBadgeSystem = () => {
  const { showBadgeEarned } = useNotifications();
  const [learningStats, setLearningStats] = useState<LearningStats>({
    totalLessonsCompleted: 0,
    consecutiveDays: 7, // 예시 데이터
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

  const checkAndAwardBadges = useCallback((newStats: Partial<LearningStats>) => {
    const updatedStats = { ...learningStats, ...newStats };
    setLearningStats(updatedStats);

    badges.forEach(badge => {
      if (!badge.earned && badge.condition(updatedStats)) {
        // 뱃지 획득 알림 표시
        showBadgeEarned(badge.name, badge.description);
        
        // 뱃지 상태 업데이트 (실제로는 localStorage나 서버에 저장)
        badge.earned = true;
        badge.earnedDate = new Date().toISOString().split('T')[0];
      }
    });
  }, [learningStats, showBadgeEarned]);

  const updateLearningProgress = useCallback((type: 'lesson' | 'chapter' | 'review' | 'fast_answer', amount: number = 1) => {
    const updates: Partial<LearningStats> = {};
    
    switch (type) {
      case 'lesson':
        updates.totalLessonsCompleted = learningStats.totalLessonsCompleted + amount;
        break;
      case 'chapter':
        updates.chaptersCompleted = learningStats.chaptersCompleted + amount;
        break;
      case 'review':
        updates.reviewsCompleted = learningStats.reviewsCompleted + amount;
        break;
      case 'fast_answer':
        updates.fastAnswers = learningStats.fastAnswers + amount;
        break;
    }

    checkAndAwardBadges(updates);
  }, [learningStats, checkAndAwardBadges]);

  return {
    badges,
    learningStats,
    updateLearningProgress
  };
};