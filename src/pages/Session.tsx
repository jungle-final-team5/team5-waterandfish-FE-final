import { useState, useEffect, useRef } from 'react';
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
  Clock,
  RefreshCw
} from 'lucide-react';

import ExampleAnim from '@/components/ExampleAnim';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import QuizTimer from '@/components/QuizTimer';
import { useLearningData } from '@/hooks/useLearningData';
import { Lesson } from '@/types/learning';
import { signClassifierClient, ClassificationResult } from '../services/SignClassifierClient';
import { useVideoStream } from '../hooks/useVideoStream';

const Session = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [currentResult, setCurrentResult] = useState<ClassificationResult | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { videoRef, canvasRef, state, startStream, stopStream, captureFrameAsync } = useVideoStream();
  const [transmissionCount, setTransmissionCount] = useState(0);

  const navigate = useNavigate();
  const { categoryId, chapterId, sessionType } = useParams();
  const { getCategoryById, getChapterById, addToReview, markSignCompleted, markChapterCompleted, markCategoryCompleted, getChapterProgress } = useLearningData();

  const [data, setData] = useState(null);
  const [currentFrame, setCurrentFrame] = useState(0);

  const [currentSignIndex, setCurrentSignIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [progress, setProgress] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [quizResults, setQuizResults] = useState<{ signId: string, correct: boolean, timeSpent: number }[]>([]);
  const [quizStarted, setQuizStarted] = useState(false);

  const [isPlaying, setIsPlaying] = useState(true); // 자동 재생 활성화
  const [animationSpeed, setAnimationSpeed] = useState(30);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [autoStarted, setAutoStarted] = useState(false);

  const isQuizMode = sessionType === 'quiz';
  const QUIZ_TIME_LIMIT = 15; // 15초 제한

  const category = categoryId ? getCategoryById(categoryId) : null;
  const chapter = categoryId && chapterId ? getChapterById(categoryId, chapterId) : null;
  const currentSign = chapter?.signs[currentSignIndex];

  const transmissionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 자동 연결 및 스트림 시작
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // 분류 결과 콜백 설정
        signClassifierClient.onResult((result) => {
          setCurrentResult(result);
          console.log('🎯 분류 결과:', result);
        });

        // 서버 연결
        const success = await signClassifierClient.connect();
        setIsConnected(success);
        
        if (success) {
          // 비디오 스트림 시작
          await startStream();
          
          // 전송 시작
          setTimeout(() => {
            if (state.isStreaming) {
              handleStartTransmission();
            }
          }, 1000);
        } else {
          setConnectionError('서버 연결에 실패했습니다. 페이지를 새로고침해주세요.');
        }
      } catch (error) {
        console.error('세션 초기화 실패:', error);
        setConnectionError('연결 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
      }
    };

    initializeSession();

    return () => {
      signClassifierClient.disconnect();
      stopStream();
      if (transmissionIntervalRef.current) {
        clearInterval(transmissionIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (chapter) {
      setProgress((currentSignIndex / chapter.signs.length) * 100);
    }
  }, [currentSignIndex, chapter]);

  const handleStartTransmission = () => {
    if (!isConnected) {
      console.log('서버에 연결되지 않음');
      return;
    }

    if (!state.isStreaming) {
      console.log('비디오 스트림이 시작되지 않음');
      return;
    }

    setIsTransmitting(true);
    setTransmissionCount(0);

    // 100ms마다 프레임 전송 (10fps)
    transmissionIntervalRef.current = setInterval(async () => {
      const frame = await captureFrameAsync();
      if (frame) {
        const success = signClassifierClient.sendVideoChunk(frame);
        if (success) {
          setTransmissionCount(prev => prev + 1);
        }
      }
    }, 100);
  };

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

  // 애니메이션 재생/정지 처리
  useEffect(() => {
    if (isPlaying && data) {
      animationIntervalRef.current = setInterval(() => {
        if (currentFrame < data.pose.length - 1) {
          setCurrentFrame(prev => prev + 1);
        } else {
          setCurrentFrame(0);
        }
      }, 1000 / animationSpeed);
    } else {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    }

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, [isPlaying, animationSpeed, data, currentFrame]);

  const loadData = async () => {
    try {
      // 첫 번째 JSON 파일만 로드
      const response = await fetch('/result/KETI_SL_0000000414_landmarks.json');
      const landmarkData = await response.json();
      setData(landmarkData);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
  };

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

  // 연결 오류 시 새로고침 안내
  if (connectionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <CardTitle>연결 오류</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{connectionError}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              페이지 새로고침
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/home')}
            >
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                  정답률: {Math.round((correctAnswers / totalQuestions) * 100)}%
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
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">수어 예시</h3>
                <ExampleAnim data={data} currentFrame={currentFrame} showCylinders={true} showLeftHand={true} showRightHand={true} />
              </div>
            )}

            {/* 웹캠 및 분류 결과 */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800">따라하기</h3>
              
              {/* 연결 상태 표시 */}
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {isConnected ? '연결됨' : '연결 중...'}
                </span>
                {isTransmitting && (
                  <span className="text-sm text-blue-600">전송 중...</span>
                )}
              </div>

              {/* 비디오 스트림 */}
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full border rounded-lg bg-gray-100"
                  autoPlay
                  muted
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
              </div>

              {/* 분류 결과 */}
              {currentResult && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {currentResult.prediction}
                  </div>
                  <div className="text-sm text-gray-600">
                    신뢰도: {(currentResult.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              )}

              {/* 문제 발생 시 새로고침 안내 */}
              {!isConnected && !connectionError && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">연결 중...</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    서버에 연결하는 중입니다. 잠시만 기다려주세요.
                  </p>
                </div>
              )}
            </div>

            {/* 피드백 */}
            {feedback && (
              <div className="mt-8">
                <FeedbackDisplay feedback={feedback} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Session;