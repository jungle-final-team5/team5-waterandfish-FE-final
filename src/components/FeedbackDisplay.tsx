import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FeedbackDisplayProps {
  feedback: 'correct' | 'incorrect';
  prediction?: string;
  onComplete?: () => void;
}

const FeedbackDisplay = ({ feedback, prediction, onComplete }: FeedbackDisplayProps) => {
  const isCorrect = feedback === 'correct';
  const [countdown, setCountdown] = useState(3);
  const [waitingForNone, setWaitingForNone] = useState(false);

  useEffect(() => {
    if (isCorrect) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // 3초 경과 후 prediction 체크
            checkPredictionAndComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isCorrect]);

  const checkPredictionAndComplete = () => {
    if (prediction && prediction.toLowerCase() === 'none') {
      console.log('✅ Prediction이 None입니다. 다음으로 진행합니다.');
      onComplete?.();
    } else {
      console.log('⏳ Prediction이 아직 None이 아닙니다. 대기 중...');
      setWaitingForNone(true);
    }
  };

  // prediction이 변경될 때마다 체크
  useEffect(() => {
    if (waitingForNone && prediction && prediction.toLowerCase() === 'none') {
      console.log('✅ Prediction이 None으로 변경되었습니다. 다음으로 진행합니다.');
      onComplete?.();
      setWaitingForNone(false);
    }
  }, [prediction, waitingForNone, onComplete]);

  if (isCorrect) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-500">
        <Card className="border-4 border-green-500 bg-green-50 max-w-md w-full mx-4 animate-in zoom-in-95 duration-700">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-6">
              {/* 큰 성공 아이콘 */}
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-green-500 animate-bounce">
                  <CheckCircle className="h-16 w-16 text-white" />
                </div>
              </div>
              
              {/* 성공 메시지 */}
              <div>
                <h2 className="text-3xl font-bold text-green-800 mb-3">
                  정답입니다! 🎉
                </h2>
                <p className="text-lg text-green-700 mb-4">
                  수어 동작을 정확하게 수행했습니다!
                </p>
                
                {/* 카운트다운 및 대기 상태 */}
                {countdown > 0 ? (
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-sm text-green-600">다음 수어까지</span>
                    <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg animate-pulse">
                      {countdown}
                    </div>
                    <span className="text-sm text-green-600">초</span>
                  </div>
                ) : waitingForNone ? (
                  <div className="text-sm text-green-600">
                    <div className="animate-spin inline-block w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full mr-2"></div>
                    손을 내려주세요...
                  </div>
                ) : (
                  <div className="text-sm text-green-600">
                    다음 수어로 이동 중...
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 오답일 때는 기존 스타일 유지
  return (
    <Card className="border-2 border-red-500 bg-red-50">
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          <div className="p-2 rounded-full bg-red-500">
            <XCircle className="h-6 w-6 text-white" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2 text-red-800">
              아쉬워요, 다시 해보세요
            </h3>
            
            <p className="mb-4 text-red-700">
              손 모양이나 동작이 조금 다른 것 같아요.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 mb-1">개선 힌트</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• 손가락 모양을 다시 확인해보세요</li>
                    <li>• 손목의 각도를 조정해보세요</li>
                    <li>• 예시 영상을 다시 천천히 관찰해보세요</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackDisplay;
