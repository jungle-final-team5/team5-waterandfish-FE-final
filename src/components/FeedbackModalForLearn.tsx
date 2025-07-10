import React, { useEffect } from 'react';

interface FeedbackModalForLearnProps {
  feedback: 'correct' | 'incorrect';
  prediction: string;
  onComplete: () => void;
}

const FeedbackModalForLearn: React.FC<FeedbackModalForLearnProps> = ({ feedback, prediction, onComplete }) => {
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (feedback === 'correct') {
      timer = setTimeout(() => {
        onComplete();
      }, 3000);
    } else if (feedback === 'incorrect') {
      timer = setTimeout(() => {
        onComplete();
      }, 2000);
    }
    return () => clearTimeout(timer);
  }, [feedback, onComplete]);

  // 진짜 모달 구조로 변경 (FeedbackDisplay.tsx 참고)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-500">
      <div className={`bg-white rounded-lg shadow-lg border-4 ${feedback === 'correct' ? 'border-green-400' : 'border-red-400'} max-w-md w-full mx-4 animate-in zoom-in-95 duration-700 p-8 flex flex-col items-center`}>
        {feedback === 'correct' ? (
          <>
            <div className="text-green-500 mb-2">
              <svg width="64" height="64" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#22c55e"/><path d="M8 12.5l3 3 5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="text-2xl font-bold text-green-700 mb-2">정답입니다! 🎉</div>
            <div className="text-gray-700 mb-2">수어 동작을 정확하게 수행했습니다!</div>
            <div className="flex items-center justify-center space-x-2 mt-4">
              <span className="text-sm text-green-600">다음 시도까지</span>
              <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg animate-pulse">3</div>
              <span className="text-sm text-green-600">초</span>
            </div>
          </>
        ) : (
          <>
            <div className="text-red-500 mb-2">
              <svg width="64" height="64" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#ef4444"/><path d="M9 9l6 6M15 9l-6 6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <div className="text-2xl font-bold text-red-700 mb-2">아쉽습니다!</div>
            <div className="text-gray-700 mb-2">다시 시도해보세요.</div>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackModalForLearn; 