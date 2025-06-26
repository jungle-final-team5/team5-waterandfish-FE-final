
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Lightbulb } from 'lucide-react';

interface FeedbackDisplayProps {
  feedback: 'correct' | 'incorrect';
}

const FeedbackDisplay = ({ feedback }: FeedbackDisplayProps) => {
  const isCorrect = feedback === 'correct';

  return (
    <Card className={`border-2 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          <div className={`p-2 rounded-full ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
            {isCorrect ? (
              <CheckCircle className="h-6 w-6 text-white" />
            ) : (
              <XCircle className="h-6 w-6 text-white" />
            )}
          </div>
          
          <div className="flex-1">
            <h3 className={`text-lg font-semibold mb-2 ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
              {isCorrect ? '정답입니다! 🎉' : '아쉬워요, 다시 해보세요'}
            </h3>
            
            <p className={`mb-4 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect 
                ? '수어 동작을 정확하게 수행했습니다. 훌륭해요!'
                : '손 모양이나 동작이 조금 다른 것 같아요.'
              }
            </p>

            {!isCorrect && (
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
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackDisplay;
