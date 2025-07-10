import React, { useEffect } from 'react';

interface FeedbackModalForLearnProps {
  feedback: 'correct' | 'incorrect';
  prediction: string;
  onComplete: () => void;
}

const FeedbackModalForLearn: React.FC<FeedbackModalForLearnProps> = ({ feedback, prediction, onComplete }) => {
  useEffect(() => {
    if (feedback === 'correct' || feedback === 'incorrect') {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-lg border-2 border-green-400">
      {feedback === 'correct' ? (
        <>
          <div className="text-green-500 mb-2">
            <svg width="64" height="64" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#22c55e"/><path d="M8 12.5l3 3 5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="text-2xl font-bold text-green-700 mb-2">정답입니다! 🎉</div>
          <div className="text-gray-700 mb-2">수어 동작을 정확하게 수행했습니다!</div>
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
  );
};

export default FeedbackModalForLearn; 