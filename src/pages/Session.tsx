import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Camera, 
  CheckCircle, 
  XCircle,
  RotateCcw,
  Clock
} from 'lucide-react';
import WebcamView from '@/components/WebcamView';
import ExampleVideo from '@/components/ExampleVideo';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import QuizTimer from '@/components/QuizTimer';
import { useLearningData } from '@/hooks/useLearningData';
import { SignWord } from '@/types/learning';

const Session = () => {
  const navigate = useNavigate();
  const { categoryId, chapterId, sessionType } = useParams();
  const { getCategoryById, getChapterById, addToReview, markSignCompleted, markChapterCompleted, markCategoryCompleted, getChapterProgress } = useLearningData();
  
  const [currentSignIndex, setCurrentSignIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [progress, setProgress] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [quizResults, setQuizResults] = useState<{signId: string, correct: boolean, timeSpent: number}[]>([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);

  const isQuizMode = sessionType === 'quiz';
  const QUIZ_TIME_LIMIT = 15; // 15초 제한

  const category = categoryId ? getCategoryById(categoryId) : null;
  const chapter = categoryId && chapterId ? getChapterById(categoryId, chapterId) : null;
  const currentSign = chapter?.signs[currentSignIndex];

  useEffect(() => {
    if (chapter) {
      setProgress((currentSignIndex / chapter.signs.length) * 100);
    }
  }, [currentSignIndex, chapter]);

  // 퀴즈 모드에서 새로운 문제가 시작될 때 자동으로 타이머 시작
  useEffect(() => {
    if (isQuizMode && currentSign && !feedback) {
      setQuizStarted(true);
      setTimerActive(true);
      setIsRecording(true);
      
      // 15초 후 자동으로 시간 초과 처리
      const timer = setTimeout(() => {
        if (isRecording && timerActive) {
          handleTimeUp();
        }
      }, QUIZ_TIME_LIMIT * 1000);

      return () => clearTimeout(timer);
    }
  }, [currentSignIndex, isQuizMode, currentSign, feedback]);

  // 학습 모드에서 자동 시작
  useEffect(() => {
    if (!isQuizMode && currentSign && !feedback && !autoStarted) {
      // 2초 후 자동으로 시작
      const timer = setTimeout(() => {
        handleStartRecording();
        setAutoStarted(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [currentSignIndex, isQuizMode, currentSign, feedback, autoStarted]);

  // 새로운 문제로 넘어갈 때 autoStarted 리셋
  useEffect(() => {
    setAutoStarted(false);
  }, [currentSignIndex]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setFeedback(null);
    
    if (isQuizMode) {
      setTimerActive(true);
    }
    
    // 3초 후 랜덤 피드백 (실제로는 ML 모델 결과)
    setTimeout(() => {
      handleRecordingComplete();
    }, 3000);
  };

  const handleRecordingComplete = () => {
    const isCorrect = Math.random() > 0.3;
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setIsRecording(false);
    setTimerActive(false);

    // 학습 진도 업데이트
    if (isCorrect && currentSign) {
      markSignCompleted(currentSign.id);
    }

    if (isQuizMode && currentSign) {
      const timeSpent = QUIZ_TIME_LIMIT - (timerActive ? QUIZ_TIME_LIMIT : 0);
      setQuizResults(prev => [...prev, {
        signId: currentSign.id,
        correct: isCorrect,
        timeSpent
      }]);
      
      if (!isCorrect) {
        addToReview(currentSign);
      }
    }

    // 퀴즈 모드에서는 항상 자동으로 다음 문제로 이동
    if (isQuizMode) {
      setTimeout(() => {
        handleNextSign();
      }, 2000);
    } else if (isCorrect) {
      // 학습 모드에서는 정답일 때 자동으로 다음 수어로 이동
      setTimeout(() => {
        handleNextSign();
      }, 2000);
    }
  };

  const handleTimeUp = () => {
    setIsRecording(false);
    setTimerActive(false);
    setFeedback('incorrect');
    
    if (currentSign) {
      setQuizResults(prev => [...prev, {
        signId: currentSign.id,
        correct: false,
        timeSpent: QUIZ_TIME_LIMIT
      }]);
      addToReview(currentSign);
    }

    // 퀴즈 모드에서는 시간 초과 시에도 자동으로 다음 문제로 이동
    setTimeout(() => {
      handleNextSign();
    }, 2000);
  };

  const handleNextSign = () => {
    if (chapter && currentSignIndex < chapter.signs.length - 1) {
      setCurrentSignIndex(currentSignIndex + 1);
      setFeedback(null);
      setTimerActive(false);
      setQuizStarted(false);
    } else {
      // 챕터 완료 처리
      if (chapter) {
        const chapterProgress = getChapterProgress(chapter);
        if (chapterProgress.percentage === 100) {
          markChapterCompleted(chapter.id);
        }
        
        // 카테고리 완료 확인
        if (category) {
          const allChaptersCompleted = category.chapters.every(ch => {
            const progress = getChapterProgress(ch);
            return progress.percentage === 100;
          });
          if (allChaptersCompleted) {
            markCategoryCompleted(category.id);
          }
        }
      }
      setSessionComplete(true);
    }
  };

  const handleRetry = () => {
    setFeedback(null);
    setIsRecording(false);
    setTimerActive(false);
    setQuizStarted(false);
    setAutoStarted(false);
  };

  if (!category || !chapter || !currentSign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">세션을 찾을 수 없습니다</h2>
          <Button onClick={() => navigate('/learn')}>돌아가기</Button>
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    const correctAnswers = quizResults.filter(r => r.correct).length;
    const totalQuestions = quizResults.length;
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <CardTitle>
              {isQuizMode ? '퀴즈 완료!' : '학습 완료!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {isQuizMode && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">결과</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {correctAnswers}/{totalQuestions}
                </p>
                <p className="text-sm text-gray-600">
                  정답률: {Math.round((correctAnswers/totalQuestions) * 100)}%
                </p>
              </div>
            )}
            <p className="text-gray-600">
              '{chapter.title}' {isQuizMode ? '퀴즈를' : '학습을'} 완료했습니다!
            </p>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/learn/category/${categoryId}`)}
              >
                챕터 목록
              </Button>
              <Button onClick={() => navigate('/home')}>
                홈으로
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate(`/learn/category/${categoryId}`)}
                className="hover:bg-blue-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                뒤로
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  {isQuizMode ? '퀴즈' : '학습'}: {currentSign.word}
                </h1>
                <p className="text-sm text-gray-600">
                  {chapter.title} • {currentSignIndex + 1}/{chapter.signs.length}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isQuizMode && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-600">퀴즈 모드</span>
                </div>
              )}
              <div className="w-32">
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* 퀴즈 타이머 */}
          {isQuizMode && timerActive && (
            <div className="mb-6">
              <QuizTimer 
                duration={QUIZ_TIME_LIMIT}
                onTimeUp={handleTimeUp}
                isActive={timerActive}
              />
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-12">
            {/* 퀴즈 모드에서는 예시 영상 대신 텍스트만 표시 */}
            {isQuizMode ? (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-800">수행할 수어</h3>
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 min-h-[400px]">
                  <CardContent className="pt-8">
                    <div className="text-center flex flex-col justify-center h-full min-h-[350px]">
                      <div className="text-8xl mb-8">🤟</div>
                      <h2 className="text-4xl font-bold text-gray-800 mb-6">
                        "{currentSign.word}"
                      </h2>
                      <p className="text-lg text-gray-600">
                        위 단어를 수어로 표현해보세요
                      </p>
                      {!quizStarted && (
                        <p className="text-sm text-blue-600 mt-4">
                          퀴즈가 자동으로 시작됩니다
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-800">수어 예시</h3>
                <div className="min-h-[400px]">
                  <ExampleVideo keyword={currentSign.word} autoLoop={true} />
                </div>
              </div>
            )}

            {/* 웹캠 및 컨트롤 */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800">따라하기</h3>
              <div className="min-h-[400px]">
                <WebcamView isRecording={isRecording} />
              </div>
              
              <div className="flex flex-col items-center space-y-4">
                {isRecording && (
                  <Button disabled className="bg-red-600 text-lg px-8 py-3">
                    <div className="animate-pulse flex items-center">
                      <div className="w-3 h-3 bg-white rounded-full mr-3" />
                      {isQuizMode ? '퀴즈 진행 중...' : '인식 중...'}
                    </div>
                  </Button>
                )}
                
                {!isRecording && !feedback && !autoStarted && !isQuizMode && (
                  <div className="text-center">
                    <p className="text-sm text-blue-600 mb-2">
                      잠시 후 자동으로 시작됩니다...
                    </p>
                  </div>
                )}
                
                {/* 학습 모드에서 오답일 때만 다시 시도 버튼 표시 */}
                {feedback && !isQuizMode && feedback === 'incorrect' && (
                  <div className="flex space-x-2">
                    <Button onClick={handleRetry} variant="outline" className="text-lg px-8 py-3">
                      <RotateCcw className="h-5 w-5 mr-2" />
                      다시 시도
                    </Button>
                  </div>
                )}
                
                {/* 자동 진행 메시지 */}
                {feedback && (
                  <div className="text-center">
                    {isQuizMode ? (
                      <p className="text-base text-gray-600">
                        {feedback === 'correct' ? '정답입니다!' : '오답입니다.'} 잠시 후 다음 문제로 넘어갑니다...
                      </p>
                    ) : feedback === 'correct' ? (
                      <p className="text-base text-green-600">
                        정답입니다! 잠시 후 다음 수어로 넘어갑니다...
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 피드백 */}
          {feedback && (
            <div className="mt-8">
              <FeedbackDisplay feedback={feedback} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Session;