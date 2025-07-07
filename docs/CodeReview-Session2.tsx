// 최대한 역할별로 나누기.
// 영상 인식, 송출 부분
// 웹소켓 연결 부분
// 삭제할 부분과 삭제 사유

// 1. 라벨링
// 2. 따로 빼기

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

import ExampleAnim from '@/components/ExampleAnim';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import QuizTimer from '@/components/QuizTimer';
import { useLearningData } from '@/hooks/useLearningData';
import { Lesson } from '@/types/learning';
import { signClassifierClient, ClassificationResult } from '../services/SignClassifierClient';
import { useVideoStream } from '../hooks/useVideoStream';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SessionHeader from '@/components/SessionHeader';
import QuizDisplay from '@/components/QuizDisplay';
import LearningDisplay from '@/components/LearningDisplay';
import WebcamSection from '@/components/WebcamSection';
import { createPoseHandler } from '@/components/detect/usePoseHandler';
import HandDetectionIndicator from '@/components/HandDetectionIndicator';
import API from '@/components/AxiosInstance';

const Session = () => { // 세션 컴포넌트
  //======== 상태 변수 선언 =======
  const [isConnected, setIsConnected] = useState<boolean>(false); // 초기값에 의해 타입 결정됨.
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [currentResult, setCurrentResult] = useState<ClassificationResult | null>(null); // 이 경우는 포인터 변수
  const [connectionErrorMessage, setConnectionErrorMessage] = useState<string | null>(null); 
  const [isConnecting, setIsConnecting] = useState(false);
  const {videoRef, canvasRef, state, startStream, stopStream, captureFrameAsync } = useVideoStream();
  const [transmissionCount, setTransmissionCount] = useState(0);
  const [isCrossed, setIsCrossed] = useState(false);
  const initialPose = useRef<boolean>(false);
  const [isHandDetected, setIsHandDetected] = useState(false);

  //======== 컴포넌트 내부 변수 선언 =======
  const navigate = useNavigate();
  const { categoryId, chapterId, sessionType } = useParams();
  const { getCategoryById, getChapterById, addToReview, markSignCompleted, markChapterCompleted, markCategoryCompleted, getChapterProgress } = useLearningData();

  const [animData, setAnimData] = useState(null);
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

  const isQuizMode = sessionType === 'quiz'; // 타입과 값을 같이 비교 가능
  const QUIZ_TIME_LIMIT = 15; // 15초 제한

  //======== 컴포넌트 내부 변수 선언 =======
  const category = categoryId ? getCategoryById(categoryId) : null;
  const [chapter, setChapter] = useState<any>(null);
  const currentSign = chapter?.signs[currentSignIndex];
  const [isMovingNextSign, setIsMovingNextSign] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);



  //======== 초기화 함수 =======
  const initializeSession = async (): Promise<void> => {
    try {
      // 분류 결과 콜백 설정
      signClassifierClient.onResult((result) => {
        if (isMovingNextSign == false) {
          setCurrentResult(result);
          console.log('분류 결과:', result);
        }
      });

      // 연결 재시도 로직
      const maxAttempts = 5;
      let connected = false;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        connected = await attemptConnection(attempt);

        if (connected) {
          break;
        }

        if (attempt < maxAttempts) {
          console.log(`🔄 ${attempt}/${maxAttempts} 재시도 중... (3초 후)`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      if (connected) {
        // 비디오 스트림 시작
        setTimeout(async () => {
          try {
            await startStream();
            console.log('🎥 비디오 스트림 시작 요청 완료');
          } catch (error) {
            console.error('비디오 스트림 시작 실패:', error);
            setConnectionErrorMessage('카메라 접근에 실패했습니다. 페이지를 새로고침해주세요.');
          }
        }, 500);
      } else {
        console.error('❌ 최대 연결 시도 횟수 초과');
        setConnectionErrorMessage('서버 연결에 실패했습니다. 페이지를 새로고침해주세요.');
      }
    } catch (error) {
      console.error('세션 초기화 실패:', error);
      setConnectionErrorMessage('연결 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
    }
  };
  
  //======== 자동 연결 및 스트림 시작 =======
  useEffect(() => {

    initializeSession(); // 마운트 혹은 업데이트 루틴

    // 언마운트 루틴
    return () => {
      signClassifierClient.disconnect();
      stopStream();
      if (transmissionIntervalRef.current) {
        clearInterval(transmissionIntervalRef.current);
      }
    };
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // 비디오 스트림 준비 완료 시 전송 시작 (클로저 문제 해결)
  useEffect(() => {
    console.log('📊 스트림 상태 변경:', {
      isStreaming: state.isStreaming,
      hasStream: !!state.stream,
      isConnected,
      isTransmitting
    });

    // 모든 조건이 준비되었고 아직 전송 중이 아닐 때 전송 시작
    if (state.isStreaming && state.stream && isConnected && !isTransmitting) {
      const checkVideoElement = () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          console.log('✅ 비디오 엘리먼트 준비 완료, 전송 시작');
          console.log('비디오 readyState:', videoRef.current.readyState);
          handleStartTransmission();
        } else {
          console.log('⏳ 비디오 엘리먼트 준비 중...', {
            hasVideoRef: !!videoRef.current,
            readyState: videoRef.current?.readyState
          });
          setTimeout(checkVideoElement, 100);
        }
      };

      // 약간의 지연 후 비디오 엘리먼트 체크
      setTimeout(checkVideoElement, 200);
    }
  }, [state.isStreaming, state.stream, isConnected, isTransmitting]);

  //======== 전송 시작 함수 =======
  const handleStartTransmission = () => {
    console.log('🚀 전송 시작 시도...');
    console.log('연결 상태:', isConnected);
    console.log('스트림 상태:', state);

    // 이미 전송 중이면 중단
    if (isTransmitting) {
      console.log('⚠️ 이미 전송 중입니다.');
      return;
    }

    if (!isConnected) {
      console.log('서버에 연결되지 않음');
      setConnectionErrorMessage('서버에 연결되지 않았습니다.');
      return;
    }

    if (!state.isStreaming || !state.stream) {
      console.log('비디오 스트림이 준비되지 않음');
      setConnectionErrorMessage('비디오 스트림이 준비되지 않았습니다.');
      return;
    }

    if (!videoRef.current || videoRef.current.readyState < 2) {
      console.log('비디오 엘리먼트가 준비되지 않음');
      setConnectionErrorMessage('비디오가 준비되지 않았습니다.');
      return;
    }

    setIsTransmitting(true);
    setTransmissionCount(0);
    // setConnectionErrorMessage(null); // 전송 시작 시 에러 상태 초기화

    console.log('✅ 전송 시작!');
    transmissionIntervalRef.current = setInterval(async () => {
      try {
        const frame = await captureFrameAsync();
        if (frame) {
          const success = signClassifierClient.sendVideoChunk(frame);
          if (success) {
            setTransmissionCount(prev => prev + 1);
          } else {
            console.log('⚠️ 프레임 전송 실패');
          }
        } else {
          console.log('⚠️ 프레임 캡처 실패');
        }
      } catch (error) {
        console.error('프레임 전송 중 오류:', error);
        // 전송 오류 시 자동으로 전송 중지
        if (transmissionIntervalRef.current) {
          clearInterval(transmissionIntervalRef.current);
          transmissionIntervalRef.current = null;
          setIsTransmitting(false);
        }
      }
    }, 100);
  };

  if (!chapter || !currentSign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">챕터를 찾을 수 없습니다</h2>
          <Button onClick={() => navigate('/learn')}>돌아가기</Button>
        </div>
      </div>
    );
  }

  // TODO: 컴포넌트 분리 및 리팩토링 필요
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
                onClick={async () => {
                  try {
                    if (isQuizMode) {
                      await sendQuizResult();
                    } else {
                      await sendStudyResult();
                    }
                    navigate(`/learn/category/${categoryId}`);
                  } catch (error) {
                    console.error("결과 전송 실패:", error);
                    // 필요 시 에러 처리 추가 가능
                  }
                }}
              >
                챕터 목록
              </Button>
              <Button onClick={async () => {
                try {
                  if (isQuizMode) {
                    await sendQuizResult();
                  } else {
                    await sendStudyResult();
                  }
                  navigate('/home');
                } catch (error) {
                  console.error("결과 전송 실패:", error);
                  // 필요 시 에러 처리 추가 가능
                }
              }}>
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
      {/* 손 감지 상태 표시 인디케이터 */}

      <main className="container mx-auto px-4 py-8">



            {/* 웹캠 및 분류 결과 */}
            <WebcamSection
              isQuizMode={isQuizMode}
              isConnected={isConnected}
              isConnecting={isConnecting}
              isTransmitting={isTransmitting}
              state={state}
              videoRef={videoRef}
              canvasRef={canvasRef}
              currentResult={currentResult}
              connectionError={connectionErroMessage}
              isRecording={isRecording}
              feedback={feedback}
              handleStartRecording={handleStartRecording}
              handleNextSign={handleNextSign}
              handleRetry={handleRetry}
            />

      </main>
    </div>
  );
};

export default Session;