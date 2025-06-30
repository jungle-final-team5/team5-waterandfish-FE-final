
import { useToast } from '@/hooks/use-toast';
import { Trophy, BookOpen, Medal } from 'lucide-react';

export const useNotifications = () => {
  const { toast } = useToast();

  const showBadgeEarned = (badgeName: string, description: string) => {
    toast({
      title: "🏆 새로운 뱃지 획득!",
      description: `"${badgeName}" 뱃지를 획득했습니다! ${description}`,
      duration: 5000,
    });
  };

  const showChapterCompleted = (chapterName: string, categoryName: string) => {
    toast({
      title: "📚 챕터 완료!",
      description: `"${categoryName}" 카테고리의 "${chapterName}" 챕터를 완료했습니다!`,
      duration: 4000,
    });
  };

  const showLessonCompleted = (lessonName: string) => {
    toast({
      title: "✅ 학습 완료!",
      description: `"${lessonName}" 학습을 완료했습니다!`,
      duration: 3000,
    });
  };

  const showStreakAchievement = (days: number) => {
    toast({
      title: "🔥 연속 학습 달성!",
      description: `${days}일 연속 학습을 달성했습니다! 계속 화이팅!`,
      duration: 4000,
    });
  };

  const showProgressMilestone = (percentage: number, categoryName: string) => {
    toast({
      title: "🎯 진도 달성!",
      description: `"${categoryName}" 카테고리 ${percentage}% 완료했습니다!`,
      duration: 3000,
    });
  };

  return {
    showBadgeEarned,
    showChapterCompleted,
    showLessonCompleted,
    showStreakAchievement,
    showProgressMilestone
  };
};