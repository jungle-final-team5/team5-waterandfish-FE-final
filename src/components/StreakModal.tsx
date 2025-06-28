
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Flame, Target } from 'lucide-react';
import { cn } from "@/lib/utils";

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StreakModal = ({ isOpen, onClose }: StreakModalProps) => {
  // 연속 학습한 날짜들 (예시 데이터)
  const studyDates = [
    new Date(2024, 5, 22), // 6월 22일
    new Date(2024, 5, 23), // 6월 23일
    new Date(2024, 5, 24), // 6월 24일
    new Date(2024, 5, 25), // 6월 25일
    new Date(2024, 5, 26), // 6월 26일
    new Date(2024, 5, 27), // 6월 27일
    new Date(2024, 5, 28), // 6월 28일 (오늘)
  ];

  const today = new Date();
  
  // 날짜가 학습한 날짜인지 확인하는 함수
  const isStudyDate = (date: Date) => {
    return studyDates.some(studyDate => 
      studyDate.getDate() === date.getDate() &&
      studyDate.getMonth() === date.getMonth() &&
      studyDate.getFullYear() === date.getFullYear()
    );
  };

  // 오늘 날짜인지 확인하는 함수
  const isToday = (date: Date) => {
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const currentStreak = 7; // 현재 연속 학습 일수
  const longestStreak = 10; // 최장 연속 학습 일수

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-4 flex items-center justify-center">
            <Flame className="h-6 w-6 text-orange-500 mr-2" />
            연속 학습 기록
          </DialogTitle>
        </DialogHeader>
        
        {/* 통계 정보 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Flame className="h-5 w-5 text-orange-600 mr-1" />
              <span className="text-sm font-medium text-gray-700">현재 연속</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{currentStreak}일</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-5 w-5 text-blue-600 mr-1" />
              <span className="text-sm font-medium text-gray-700">최장 연속</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{longestStreak}일</p>
          </div>
        </div>

        {/* 달력 */}
        <div className="flex justify-center">
          <Calendar
            mode="single"
            className={cn("p-3 pointer-events-auto")}
            classNames={{
              day: cn(
                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 relative"
              ),
              day_today: "bg-blue-100 text-blue-900 font-bold ring-2 ring-blue-400",
            }}
            modifiers={{
              study: studyDates,
              today: today,
            }}
            modifiersClassNames={{
              study: "bg-green-500 text-white hover:bg-green-600 font-semibold",
              today: "bg-blue-100 text-blue-900 font-bold ring-2 ring-blue-400",
            }}
            components={{
              Day: ({ date, ...props }) => {
                const isStudy = isStudyDate(date);
                const isTodayDate = isToday(date);
                
                return (
                  <div className="relative">
                    <button
                      {...props}
                      className={cn(
                        "h-9 w-9 p-0 font-normal hover:bg-accent hover:text-accent-foreground rounded-md",
                        isStudy && "bg-green-500 text-white hover:bg-green-600 font-semibold",
                        isTodayDate && isStudy && "bg-green-500 text-white ring-2 ring-blue-400",
                        isTodayDate && !isStudy && "bg-blue-100 text-blue-900 font-bold ring-2 ring-blue-400"
                      )}
                    >
                      {date.getDate()}
                    </button>
                    {isStudy && (
                      <div className="absolute -top-1 -right-1">
                        <div className="h-2 w-2 bg-orange-400 rounded-full"></div>
                      </div>
                    )}
                  </div>
                );
              }
            }}
          />
        </div>

        {/* 범례 */}
        <div className="flex justify-center space-x-6 mt-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">학습 완료</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded mr-2"></div>
            <span className="text-sm text-gray-600">오늘</span>
          </div>
        </div>

        {/* 격려 메시지 */}
        <div className="text-center mt-6 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl">
          <p className="text-gray-700 font-medium">
            🔥 {currentStreak}일 연속 학습 중입니다!
          </p>
          <p className="text-sm text-gray-600 mt-1">
            내일도 계속해서 연속 기록을 이어가세요!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StreakModal;