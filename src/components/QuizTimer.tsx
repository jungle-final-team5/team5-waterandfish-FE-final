
import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Timer } from 'lucide-react';

interface QuizTimerProps {
  duration: number; // 초 단위
  onTimeUp: () => void;
  isActive: boolean;
  onReset?: () => void;
  onTimeChange?: (timeLeft: number) => void; // 시간 변경 콜백 추가
}

const QuizTimer = ({ duration, onTimeUp, isActive, onReset, onTimeChange }: QuizTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  // isActive가 true가 될 때만 타이머 초기화 및 시작
  useEffect(() => {
    if (isActive) {
      console.log('⏰ 타이머 시작:', duration, '초');
      setTimeLeft(duration);
    } else {
      console.log('⏸️ 타이머 정지');
      // 타이머가 정지될 때는 timeLeft를 리셋하지 않음
    }
  }, [isActive, duration]);

  useEffect(() => {
    if (!isActive) return;

    console.log('🔄 타이머 카운트다운 시작');
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        console.log('⏱️ 타이머:', prev, '초 남음');
        if (prev <= 1) {
          console.log('⏰ 시간 초과!');
          onTimeUp();
          return 0;
        }
        const newTimeLeft = prev - 1;
        if (onTimeChange) {
          onTimeChange(newTimeLeft);
        }
        return newTimeLeft;
      });
    }, 1000);

    return () => {
      console.log('🛑 타이머 정리');
      clearInterval(interval);
    };
  }, [isActive, onTimeUp]);

  const progress = ((duration - timeLeft) / duration) * 100;
  const isWarning = timeLeft <= 5;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Timer className={`h-4 w-4 ${isWarning ? 'text-red-600' : 'text-blue-600'}`} />
          <span className="text-sm font-medium text-gray-700">남은 시간</span>
        </div>
        <span className={`text-lg font-bold ${isWarning ? 'text-red-600' : 'text-blue-600'}`}>
          {timeLeft}초
        </span>
      </div>
      <Progress 
        value={progress} 
        className={`h-3 ${isWarning ? 'bg-red-100' : 'bg-blue-100'}`}
      />
      {isWarning && (
        <div className="text-center mt-2">
          <span className="text-red-600 text-sm font-medium animate-pulse">
            시간이 얼마 남지 않았습니다!
          </span>
        </div>
      )}
    </div>
  );
};

export default QuizTimer;
