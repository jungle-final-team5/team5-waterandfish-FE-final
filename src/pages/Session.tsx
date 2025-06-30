
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, RotateCcw, CheckCircle } from 'lucide-react';
import { useLearningData } from '@/hooks/useLearningData';
import { useNotifications } from '@/hooks/useNotifications';
import { useBadgeSystem } from '@/hooks/useBadgeSystem';

const Session = () => {
  const { categoryId, chapterId } = useParams();
  const navigate = useNavigate();
  const { getCategoryById, getChapterById } = useLearningData();
  const { showLessonCompleted, showChapterCompleted } = useNotifications();
  const { updateLearningProgress } = useBadgeSystem();
  
  const [currentSignIndex, setCurrentSignIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completedSigns, setCompletedSigns] = useState<Set<string>>(new Set());

  const category = getCategoryById(categoryId || '');
  const chapter = getChapterById(categoryId || '', chapterId || '');

  if (!category || !chapter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">페이지를 찾을 수 없습니다</h1>
          <Button onClick={() => navigate('/home')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  const currentSign = chapter.signs[currentSignIndex];
  const progress = ((currentSignIndex + 1) / chapter.signs.length) * 100;

  const handleNext = () => {
    if (!completedSigns.has(currentSign.id)) {
      setCompletedSigns(prev => new Set(prev).add(currentSign.id));
      showLessonCompleted(currentSign.word);
      updateLearningProgress('lesson');
    }

    if (currentSignIndex < chapter.signs.length - 1) {
      setCurrentSignIndex(currentSignIndex + 1);
      setShowAnswer(false);
    } else {
      // 챕터 완료
      showChapterCompleted(chapter.title, category.title);
      updateLearningProgress('chapter');
      navigate(`/learn/category/${categoryId}`);
    }
  };

  const handlePrevious = () => {
    if (currentSignIndex > 0) {
      setCurrentSignIndex(currentSignIndex - 1);
      setShowAnswer(false);
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate(`/learn/category/${categoryId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                돌아가기
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{chapter.title}</h1>
                <p className="text-sm text-gray-600">{category.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {currentSignIndex + 1} / {chapter.signs.length}
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-center text-2xl">
                {currentSign.word}
                {completedSigns.has(currentSign.id) && (
                  <CheckCircle className="inline-block ml-2 h-6 w-6 text-green-600" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-8">
                <div className="w-64 h-64 bg-gray-200 rounded-lg mx-auto flex items-center justify-center">
                  <span className="text-6xl">🤟</span>
                </div>
                <p className="text-gray-600 mt-4">
                  수어 동작을 따라해보세요
                </p>
              </div>

              {showAnswer && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">설명</h3>
                  <p className="text-blue-700">
                    "{currentSign.word}"의 수어 동작입니다. 
                    {currentSign.difficulty === 'easy' && ' 기본적인 동작으로 쉽게 따라하실 수 있습니다.'}
                    {currentSign.difficulty === 'medium' && ' 중간 난이도의 동작입니다.'}
                    {currentSign.difficulty === 'hard' && ' 고급 수준의 동작입니다.'}
                  </p>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={handleShowAnswer}
                  className="flex items-center"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {showAnswer ? '설명 숨기기' : '설명 보기'}
                </Button>
                
                <Button
                  onClick={handleNext}
                  className="flex items-center"
                >
                  {currentSignIndex < chapter.signs.length - 1 ? (
                    <>
                      다음
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      완료
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>

              {currentSignIndex > 0 && (
                <Button
                  variant="ghost"
                  onClick={handlePrevious}
                  className="mt-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  이전
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Progress Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between text-sm text-gray-600">
                <span>완료: {completedSigns.size}/{chapter.signs.length}</span>
                <span>진도: {Math.round(progress)}%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Session;