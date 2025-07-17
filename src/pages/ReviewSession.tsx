import { Category, Chapter, Lesson } from '@/types/learning';
import { useLearningData } from '@/hooks/useLearningData';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ClassificationResult, signClassifierClient, LandmarksData } from '@/services/SignClassifierClient';
import { useGlobalWebSocketStatus } from '@/contexts/GlobalWebSocketContext';
import React, { useState, useRef, useEffect, useCallback, startTransition } from 'react';

import API from '@/components/AxiosInstance';
import useWebsocket, { getConnectionByUrl, disconnectWebSockets } from '@/hooks/useWebsocket';
import VideoInput from '@/components/VideoInput';
import SessionHeader from '@/components/SessionHeader';
import LearningDisplay from '@/components/LearningDisplay';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import StreamingControls from '@/components/StreamingControls';
import { useMediaPipeHolistic } from '@/hooks/useMediaPipeHolistic';
import { useBadgeSystem } from '@/hooks/useBadgeSystem';
import { Button } from '@/components/ui/button';
import { useClassifierClient } from '@/hooks/useClassifierClient';
import { useAnimation } from '@/hooks/useAnimation';
import QuizTimer from '@/components/QuizTimer';



const LearnSession = () => {
  const { categoryId, chapterId } = useParams();
  const [isSlowMotion, setIsSlowMotion] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [transmissionCount, setTransmissionCount] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const QUIZ_TIME_LIMIT = 15;
  const [quizResults, setQuizResults] = useState<{ signId: string, correct: boolean, timeSpent: number }[]>([]);
  const [timeSpent, setTimeSpent] = useState(0); // 실제 사용한 시간 추적
  const [quizStarted, setQuizStarted] = useState(false);
  const [isQuizReady, setIsQuizReady] = useState(false); // 퀴즈 준비 상태 추가

  // useClassifierClient 훅 사용
  const {
    isRetrying,
    isConnected,
    currentConnectionId,
    currentWsUrl,
    lessonMapper,
    currentSignId,
    currentSign,
    currentResult,
    feedback,
    displayConfidence,
    maxConfidence,
    isBufferingPaused,
    studyList,
    setCurrentSignId,
    setCurrentSign,
    setLessonMapper,
    setFeedback,
    setDisplayConfidence,
    setMaxConfidence,
    setIsBufferingPaused,
    retryLessonMapper,
    retryWsConnection,
    connectionStatus,
    wsList,
    sendMessage,
  } = useClassifierClient();

  // 기존 상태들을 훅의 상태로 초기화
  useEffect(() => {
    setLessonMapper(location.state?.lesson_mapper || {});
  }, [location.state?.lesson_mapper, setLessonMapper]);

  const { findCategoryById, findChapterById, findHierarchyByChapterId } = useLearningData();

  const [currentSignIndex, setCurrentSignIndex] = useState(0);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const currentLessonSign = lessons[currentSignIndex];
  const currentLessonSignId = lessons[currentSignIndex]?.id;
  const [isRecording, setIsRecording] = useState(false);

  // 애니메이션 훅 사용
  const { videoSrc } = useAnimation({
    lessonId: currentLessonSignId,
    isSlowMotion
  });

  const [sessionComplete, setSessionComplete] = useState(false);

  // 랜드마크 버퍼링 관련 상태
  const [landmarksBuffer, setLandmarksBuffer] = useState<LandmarksData[]>([]);
  const bufferIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const BUFFER_DURATION = 1000; // 2초

  // 현재 수어 정보를 훅의 상태와 동기화
  useEffect(() => {
    if (currentLessonSign) {
      setCurrentSign(currentLessonSign);
      setCurrentSignId(currentLessonSignId || '');
    }
  }, [currentLessonSign, currentLessonSignId, setCurrentSign, setCurrentSignId]);

  //===============================================
  // 랜드마크 버퍼링 및 전송 처리
  //===============================================

  const [isMovingNextSign, setIsMovingNextSign] = useState(false);
  const transmissionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 재생 속도 토글 함수
  const togglePlaybackSpeed = () => {
    setIsSlowMotion(prev => !prev);
  };

  // 랜드마크 감지 시 호출되는 콜백 (useCallback으로 먼저 정의)
  const handleLandmarksDetected = useCallback((landmarks: LandmarksData) => {
    // 녹화 중일 때만 버퍼에 추가
    if (isRecording && isConnected) {
      setLandmarksBuffer(prev => {
        const newBuffer = [...prev, landmarks];
        return newBuffer;
      });
    } else {
      console.log(`⚠️ 랜드마크 버퍼링 건너뜀 - 녹화: ${isRecording}, 연결: ${isConnected}`);
    }
  }, [isRecording, isConnected]);

  // 랜드마크 버퍼링 및 전송 처리
  // MediaPipe holistic hook 사용
  const {
    videoRef,
    canvasRef,
    isInitialized,
    stopCamera,
    inspect_sequence,
    initializeSession
  } = useMediaPipeHolistic({
    onLandmarks: handleLandmarksDetected,
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
    enableLogging: false // MediaPipe 내부 로그 숨김
  });

  useEffect(() => {
    // 녹화 중이고 연결된 상태일 때만 버퍼링 시작
    if (isRecording && isConnected) {
      // 기존 타이머 정리
      if (bufferIntervalRef.current) {
        clearInterval(bufferIntervalRef.current);
      }

      // 2초마다 버퍼 전송
      bufferIntervalRef.current = setInterval(() => {
        setLandmarksBuffer(prevBuffer => {
          if (prevBuffer.length > 0) {
            // 버퍼의 모든 랜드마크를 시퀀스로 전송
            const landmarksSequence = {
              type: 'landmarks_sequence',
              data: {
                sequence: prevBuffer,
                timestamp: Date.now(),
                frame_count: prevBuffer.length
              }
            };
            const is_fast = inspect_sequence(landmarksSequence);
            if (!is_fast) {
              console.log('✅ 동작 속도 정상');
              if (isBufferingPaused) {
                setIsBufferingPaused(false);
              }
              sendMessage(JSON.stringify(landmarksSequence), currentConnectionId);
            }
            else {
              console.log('❌ 동작 속도 빠름. 시퀸스 전송 건너뜀');
              setDisplayConfidence("천천히 동작해주세요");
              setIsBufferingPaused(true);
              setLandmarksBuffer([]);
            }
            setTransmissionCount(prev => prev + prevBuffer.length);
            console.log(`📤 랜드마크 시퀀스 전송됨 (${prevBuffer.length}개 프레임)`);

            // 버퍼 비우기
            return [];
          }
          return prevBuffer;
        });
      }, BUFFER_DURATION);

      console.log('🔄 랜드마크 버퍼링 시작 (1초 간격)');
    } else {
      // 녹화 중이 아니거나 연결이 끊어진 경우 타이머 정리
      if (bufferIntervalRef.current) {
        clearInterval(bufferIntervalRef.current);
        bufferIntervalRef.current = null;
      }

      // 버퍼 비우기
      setLandmarksBuffer([]);
    }

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (bufferIntervalRef.current) {
        clearInterval(bufferIntervalRef.current);
        bufferIntervalRef.current = null;
      }
    };
  }, [isRecording, isConnected, currentConnectionId, sendMessage, isBufferingPaused, currentResult, setDisplayConfidence, setIsBufferingPaused]);

  useEffect(() => {
    setIsRecording(true);
    return () => {
      disconnectWebSockets();
      // 버퍼링 타이머 정리
      if (bufferIntervalRef.current) {
        clearInterval(bufferIntervalRef.current);
        bufferIntervalRef.current = null;
      }
    }
  }, []);

  //===============================================

  //===============================================
  // LearnSession 컴포넌트 관련 처리
  //===============================================
    // 다음 수어(레슨)으로 넘어가는 내용
  const handleNextSign = useCallback(async (latestResults = quizResults) => {
    setIsMovingNextSign(false);
    
    // 현재 isQuizMode 상태를 기반으로 로직 처리
    if (isQuizMode) {
      // 퀴즈 모드에서 학습 모드로 전환
      setTimerActive(false);
      setQuizStarted(false);
      setIsRecording(false);
      setIsQuizReady(false);

      if (lessons && currentSignIndex < lessons.length - 1) {
        if (feedback === "correct") {
          setFeedback("correct");
          setCurrentSignIndex(prev => prev + 1);
          const nextLesson = lessons[currentSignIndex + 1];
          
        } else {
          setFeedback("incorrect");
        }
        setFeedback(null);
        setIsRecording(true);
      } else {
        setSessionComplete(true);
        disconnectWebSockets();
      }
    } else {
      // 학습 모드에서 퀴즈 모드로 전환
      setFeedback(null);
      setIsRecording(true);
      setTimerActive(true);
      setTimeSpent(0);
    }
    
    // 모드 토글
    setIsQuizMode(prev => !prev);
  }, [isQuizMode, currentSignIndex, lessons, quizResults, setFeedback, setCurrentSign, setCurrentSignId, setSessionComplete, setTimerActive, setQuizStarted, setIsRecording, setIsQuizReady, setTimeSpent, disconnectWebSockets, feedback]);

  useEffect(() => {
    setCurrentSign(lessons[currentSignIndex]);
    setCurrentSignId(lessons[currentSignIndex]?.id || '');
  }, [currentSignIndex, lessons, setCurrentSign, setCurrentSignId]);


  // FeedbackDisplay 완료 콜백 함수. Feedback 복구 시 해당 메서드 실행하게끔 조치
  const handleFeedbackComplete = () => {
    console.log('🎉 FeedbackDisplay 완료, 다음 수어로 이동');
    handleNextSign();
  };

  // 컴포넌트 마운트 시 자동 초기화
  useEffect(() => {
    const initialize = async () => {
      // MediaPipe 초기화 대기
      if (isInitialized) {
        console.log('🚀 자동 초기화 시작...');
        // await attemptConnection();
        await initializeSession();
      }
    };

    initialize();

    // 언마운트 시 정리 (disconnectWebSockets는 sessionComplete에서만 호출)
    return () => {
      signClassifierClient.disconnect();
      stopCamera();
      if (transmissionIntervalRef.current) {
        clearInterval(transmissionIntervalRef.current);
      }
      // disconnectWebSockets()는 여기서 호출하지 않음
    };
  }, [isInitialized]);

  // 시간 초과 시 호출
  const handleTimeUp = useCallback(() => {
    console.log('⏰ 시간 초과! 오답 처리');
    setIsRecording(false);
    setTimerActive(false);
    setFeedback('incorrect');

    if (currentSign) {
      // 새 결과 객체 생성
      const newResult = {
        signId: currentSign.id,
        correct: false,
        timeSpent: QUIZ_TIME_LIMIT
      };

      // 상태 업데이트와 동시에 로컬 변수에도 저장
      setQuizResults(prev => {
        const updatedResults = [...prev, newResult];

        // 상태 업데이트 후 3초 뒤에 다음 문제로 이동
        setTimeout(() => {
          console.log("업데이트된 퀴즈 결과:", updatedResults);
          handleNextSign(updatedResults); // 업데이트된 결과를 인자로 전달
        }, 3000);

        return updatedResults;
      });
    }
  }, [currentSign]);

  // 챕터 아이디를 통해 챕터 첫 준비
  useEffect(() => {
    if (chapterId) {
      const loadChapter = async () => {
        try {
          const wrongLessonsData = await API.get<{ success: boolean; data: Lesson[] }>(`/progress/failures/${chapterId}`);
          const wrongLessons = wrongLessonsData.data.data;
          setLessons(wrongLessons);
        } catch (error) {
          console.error('챕터 데이터 로드 실패:', error);
        }
      };
      loadChapter();
    }
  }, [categoryId, chapterId]);

  // 챕터 목록 준비 된 후 initialize [작업 중]
  useEffect(() => {
    setCurrentSignIndex(0);
    setFeedback(null);

    // 컴포넌트 언마운트 시 정리 작업 실시 
    return () => {
      // 재시도 타이머 정리
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [setFeedback]);

  // 학습 세션 진입 시 /progress/lessons/events 호출 (mode: 'study')
  useEffect(() => {
    if (lessons && lessons.length > 0) {
      const lessonIds = lessons.map(l => l.id);
      API.post('/progress/lessons/events', { lesson_ids: lessonIds, mode: 'study' });
    }
  }, [lessons]);

  // 세션 완료 시 레슨 status 업데이트, 뱃지 체크, navigate를 순차적으로 처리
  if (sessionComplete) // 모든 내용이 완료 된 경우
  {
    // 뱃지 체크는 SessionComplete에서 단 한 번 다루는 걸로 옮김
    navigate(`/complete/chapter/${chapterId}/${1}`);
  }

  // sessionComplete 시 소켓 연결 해제, 동시에 챕터 단위 진행도 업데이트
  useEffect(() => {
    if (!sessionComplete) return;
    if (!lessons || lessons.length === 0 || !chapterId) return;

    disconnectWebSockets();
    API.post(`/progress/chapters/${chapterId}/lessons`,
      { lesson_ids: lessons.map(l => l.id), status: "study" })
      .then(() => {
        navigate(`/complete/chapter/${chapterId}/${3}`);
      });
    // eslint-disable-next-line
  }, [sessionComplete]);

  //===============================================


  return (
    <div className="min-h-screen bg-gray-50">
      <SessionHeader
        currentMode={"복습"}
        chapterId={chapterId}
        currentSignIndex={currentSignIndex}
        progress={currentSignIndex/(lessons.length - 1)}
        categoryId={undefined}
        navigate={navigate}
        feedback={feedback}
      />

      <div className="grid lg:grid-cols-2 gap-12">
      <div className="mt-12 p-3 bg-gray-100 rounded-md">
        <div className="space-y-4">
        {!isQuizMode && (
          videoSrc ? (
            <video
              src={videoSrc}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto"
            />
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-200 rounded">
              <p>비디오 로딩 중...</p>
            </div>
          )
        )}
        {/* 퀴즈 타이머 */}
        {isQuizMode && (
          <div className="mb-6">
            <QuizTimer
              duration={QUIZ_TIME_LIMIT}
              onTimeUp={handleTimeUp}
              isActive={timerActive}
              onTimeChange={setTimeSpent}
            />
            
            <div className="grid lg:grid-cols-2 gap-12">
              {/* 맞춰야 할 단어 표시 (애니메이션 자리) */}
              <div className="flex items-center justify-center bg-white rounded-lg shadow-lg p-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-blue-600 mb-4">
                    이 수어를 맞춰보세요!
                  </h2>
                  <div className="text-6xl font-bold text-gray-800 mb-4">
                    {currentSign?.word || '로딩 중...'}
                  </div>
                  <p className="text-gray-600 mb-6">
                    {currentSignIndex + 1} / {lessons.length}
                  </p>

                  {/* 퀴즈 진행 중 표시 */}
                  {isQuizMode && (
                    <div className="text-green-600 font-semibold text-lg">
                      ⏱️ 퀴즈 진행 중...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
        </div>
        <div className="mt-4 p-3 bg-gray-100 rounded-md">

          {/* 비디오 입력 영역 */}
          <div className="space-y-4">
            <VideoInput
              width={640}
              height={480}
              autoStart={true}
              showControls={true}
              className="h-full"
              currentSign={currentLessonSign}
              currentResult={displayConfidence}
            />
            <Button
              onClick={togglePlaybackSpeed}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              {isSlowMotion ? '일반 속도' : '천천히 보기'}
              {isSlowMotion ? '(1x)' : '(0.5x)'}
            </Button>

            <StreamingControls
              connectionStatus={connectionStatus}
              transitionSign={handleNextSign}
            />

            {/* 숨겨진 비디오 요소들 */}
            <div className="hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} />
            </div>
          </div>

        </div>
        {/* 피드백 표시 */}
        {feedback && (
          <div className="mt-8">
            <FeedbackDisplay
              feedback={feedback}
              prediction={currentResult?.prediction}
              onComplete={feedback === 'correct' ? handleFeedbackComplete : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnSession;

