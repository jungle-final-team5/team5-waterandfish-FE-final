import { useState } from 'react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  BookOpen, 
  RotateCcw, 
  Bell, 
  User,
  Trophy,
  Target
} from 'lucide-react';

interface OnboardingTourProps {
  currentStep: number;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
  onPrevious: () => void;
}

const OnboardingTour = ({ currentStep, onNext, onSkip, onComplete, onPrevious }: OnboardingTourProps) => {
  const steps = [
    {
      title: "수어지교에 오신 것을 환영합니다! 🎉",
      description: "수어 학습의 새로운 경험을 시작해보세요. 실시간 모션 인식으로 효과적인 학습이 가능합니다.",
      icon: <div className="text-4xl">🤟</div>,
      position: "center"
    },
    {
      title: "수어 검색 기능",
      description: "궁금한 수어를 바로 검색해보세요. 단어나 문장을 입력하면 해당 수어 동작을 확인할 수 있습니다.",
      icon: <Search className="h-8 w-8 text-blue-600" />,
      position: "search-button",
      highlight: "[data-tour='search-button']"
    },
    {
      title: "체계적인 학습",
      description: "기초부터 고급까지 단계별로 구성된 학습 과정을 통해 수어를 배워보세요.",
      icon: <BookOpen className="h-8 w-8 text-green-600" />,
      position: "learn-button",
      highlight: "[data-tour='learn-button']"
    },
    {
      title: "복습 기능",
      description: "학습한 내용을 잊지 않도록 정기적으로 복습해보세요. 틀린 문제는 자동으로 관리됩니다.",
      icon: <RotateCcw className="h-8 w-8 text-purple-600" />,
      position: "review-button",
      highlight: "[data-tour='review-button']"
    },
    {
      title: "학습 현황 확인",
      description: "연속 학습 일수, 획득한 뱃지, 전체 진도율을 확인하며 학습 동기를 유지하세요.",
      icon: <Trophy className="h-8 w-8 text-yellow-600" />,
      position: "dashboard-cards",
      highlight: "[data-tour='dashboard-cards']"
    },
    {
      title: "알림 기능",
      description: "새로운 뱃지 획득, 학습 완료 등의 알림을 확인할 수 있습니다.",
      icon: <Bell className="h-8 w-8 text-red-600" />,
      position: "notification-button",
      highlight: "[data-tour='notification-button']"
    },
    {
      title: "학습 시작하기",
      description: "이제 모든 기능을 알아보셨습니다. 수어 학습을 시작해보세요!",
      icon: <Target className="h-8 w-8 text-blue-600" />,
      position: "center"
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // 하이라이트 효과 적용
  useEffect(() => {
    if (currentStepData.highlight) {
      const element = document.querySelector(currentStepData.highlight);
      if (element) {
        element.classList.add('onboarding-highlight');
      }
    }

    return () => {
      // 클린업: 모든 하이라이트 제거
      document.querySelectorAll('.onboarding-highlight').forEach(el => {
        el.classList.remove('onboarding-highlight');
      });
    };
    }, [currentStep, currentStepData.highlight]);

  const getCardPosition = () => {
    switch (currentStepData.position) {
      case "center":
        return "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2";
      case "search-button":
        return "fixed top-32 left-1/2 transform -translate-x-1/2";
      case "learn-button":
        return "fixed top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2";
      case "review-button":
        return "fixed top-1/2 right-1/4 transform translate-x-1/2 -translate-y-1/2";
      case "dashboard-cards":
        return "fixed bottom-32 left-1/2 transform -translate-x-1/2";
      case "notification-button":
        return "fixed top-32 right-1/4 transform translate-x-1/2";
      default:
        return "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2";
    }
  };

  return (
    <>
      {/* 배경 오버레이 */}
      <div className="fixed inset-0 bg-black/50 z-50" />
      
      {/* 온보딩 카드 */}
      <Card className={`${getCardPosition()} z-50 w-96 shadow-2xl border-2 border-blue-200`}>
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className="text-xs">
              {currentStep + 1} / {steps.length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="h-8 w-8 p-0 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-center mb-3">
            {currentStepData.icon}
          </div>
          <CardTitle className="text-lg text-gray-800">
            {currentStepData.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-6 leading-relaxed">
            {currentStepData.description}
          </p>
          
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
                            onClick={currentStep > 0 ? onPrevious : onSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              {currentStep > 0 ? (
                <>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  이전
                </>
              ) : (
                "건너뛰기"
              )}
            </Button>
            
            <Button
              onClick={isLastStep ? onComplete : onNext}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLastStep ? "시작하기" : "다음"}
              {!isLastStep && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CSS 스타일 */}
      <style>{`
        .onboarding-highlight {
          position: relative;
          z-index: 51;
          border-radius: 8px;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2);
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.8), 0 0 0 8px rgba(59, 130, 246, 0.4);
          }
        }
      `}</style>
    </>
  );
};

export default OnboardingTour;