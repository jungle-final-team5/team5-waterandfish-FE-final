
import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Timer } from 'lucide-react';

interface QuizTimerProps {
  duration: number; // 초 단위
  onTimeUp: () => void;
  isActive: boolean;
  onReset?: () => void;
}

const QuizTimer = ({ duration, onTimeUp, isActive, onReset }: QuizTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (onReset) {
      setTimeLeft(duration);
    }
  }, [onReset, duration]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
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
