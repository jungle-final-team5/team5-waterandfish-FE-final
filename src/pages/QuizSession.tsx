import { useState, useEffect, useRef, useCallback } from 'react';
import { signClassifierClient, ClassificationResult, LandmarksData } from '../services/SignClassifierClient';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLearningData } from '@/hooks/useLearningData';
import { useVideoStreaming } from '@/hooks/useVideoStreaming';
import { useMediaPipeHolistic } from '@/hooks/useMediaPipeHolistic';
import { useGlobalWebSocketStatus } from '@/contexts/GlobalWebSocketContext';
import { Button } from '@/components/ui/button';

import HandDetectionIndicator from '@/components/HandDetectionIndicator';
import { createPoseHandler } from '@/components/detect/usePoseHandler';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import QuizTimer from '@/components/QuizTimer';
import SessionHeader from '@/components/SessionHeader';
import WebcamSection from '@/components/WebcamSection';
import NotFound from './NotFound';
import API from '@/components/AxiosInstance';
import { Chapter } from '@/types/learning';
import useWebsocket, { getConnectionByUrl, disconnectWebSockets } from '@/hooks/useWebsocket';
import VideoInput from '@/components/VideoInput';
import StreamingControls from '@/components/StreamingControls';
import { useBadgeSystem } from '@/hooks/useBadgeSystem';

// 재시도 설정
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000, // 1초
  maxDelay: 5000, // 5초
};

const QuizSession = () => {
  const { checkBadges } = useBadgeSystem();
  const { categoryId, chapterId, sessionType } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [transmissionCount, setTransmissionCount] = useState(0);
  const [lesson_mapper, setLessonMapper] = useState<{ [key: string]: string }>(location.state?.lesson_mapper || {});
  const [currentWsUrl, setCurrentWsUrl] = useState<string>('');
  const [currentConnectionId, setCurrentConnectionId] = useState<string>('');

  // 재시도 관련 상태
  const [retryAttempts, setRetryAttempts] = useState({
    lessonMapper: 0,
    wsConnection: 0,
  });
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const studyListRef = useRef<string[]>([]);

  // WebGL 지원 확인
  useEffect(() => {
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        setWebglSupported(!!gl);
      } catch (err) {
        setWebglSupported(false);
      }
    };

    checkWebGL();
  }, []);

  // lesson_mapper 재시도 함수
  const retryLessonMapper = useCallback(async () => {
    if (retryAttempts.lessonMapper >= RETRY_CONFIG.maxAttempts) {
      console.error('[QuizSession] lesson_mapper 재시도 횟수 초과');
      // lesson_mapper가 없어도 퀴즈는 진행할 수 있도록 수정
      setIsRetrying(false);
      return;
    }

    setIsRetrying(true);
    const delay = Math.min(
      RETRY_CONFIG.initialDelay * Math.pow(2, retryAttempts.lessonMapper),
      RETRY_CONFIG.maxDelay
    );

    console.log(`[QuizSession] lesson_mapper 재시도 ${retryAttempts.lessonMapper + 1}/${RETRY_CONFIG.maxAttempts} (${delay}ms 후)`);

    retryTimeoutRef.current = setTimeout(() => {
      if (location.state?.lesson_mapper && Object.keys(location.state.lesson_mapper).length > 0) {
        setLessonMapper(location.state.lesson_mapper);
        setRetryAttempts(prev => ({ ...prev, lessonMapper: 0 }));
        if (retryAttempts.wsConnection === 0 && currentConnectionId) {
          setIsRetrying(false);
        }
        console.log('[QuizSession] lesson_mapper 재시도 성공');
      } else {
        // lesson_mapper가 없어도 퀴즈 진행 가능하도록 수정
        console.log('[QuizSession] lesson_mapper 없음, 퀴즈 모드로 진행');
        setIsRetrying(false);
      }
    }, delay);
  }, [retryAttempts.lessonMapper, retryAttempts.wsConnection, location.state, currentConnectionId]);

  // WebSocket 연결 재시도 함수
  const retryWsConnection = useCallback(async (targetUrl: string) => {
    if (retryAttempts.wsConnection >= RETRY_CONFIG.maxAttempts) {
      console.error('[QuizSession] WebSocket 연결 재시도 횟수 초과');
      alert('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
      setIsRetrying(false);
      return;
    }

    setIsRetrying(true);
    const delay = Math.min(
      RETRY_CONFIG.initialDelay * Math.pow(2, retryAttempts.wsConnection),
      RETRY_CONFIG.maxDelay
    );

    console.log(`[QuizSession] WebSocket 연결 재시도 ${retryAttempts.wsConnection + 1}/${RETRY_CONFIG.maxAttempts} (${delay}ms 후)`);

    retryTimeoutRef.current = setTimeout(() => {
      const connection = getConnectionByUrl(targetUrl);
      if (connection) {
        setCurrentConnectionId(connection.id);
        setRetryAttempts(prev => ({ ...prev, wsConnection: 0 }));
        if (retryAttempts.lessonMapper === 0 && Object.keys(lesson_mapper).length > 0) {
          setIsRetrying(false);
        }
        console.log('[QuizSession] WebSocket 연결 재시도 성공:', connection.id);
      } else {
        setRetryAttempts(prev => ({ ...prev, wsConnection: prev.wsConnection + 1 }));
        retryWsConnection(targetUrl);
      }
    }, delay);
  }, [retryAttempts.wsConnection, retryAttempts.lessonMapper, lesson_mapper]);

  // lesson_mapper 디버그 로그 및 초기 로드
  useEffect(() => {
    console.log('[QuizSession] lesson_mapper:', lesson_mapper);
    console.log('[QuizSession] lesson_mapper keys:', Object.keys(lesson_mapper));

    // lesson_mapper가 비어있으면 API에서 직접 로드
    if (Object.keys(lesson_mapper).length === 0 && !isRetrying && chapterId) {
      console.log('[QuizSession] lesson_mapper가 비어있음, API에서 로드 시작');
      loadLessonMapper();
    }
  }, [lesson_mapper, isRetrying, chapterId]);

  // lesson_mapper 로드 함수
  const loadLessonMapper = async () => {
    try {
      console.log('[QuizSession] lesson_mapper API 호출 시작');
      const response = await API.get(`/ml/deploy/${chapterId}`);
      console.log('[QuizSession] lesson_mapper API 응답:', response.data);
      
      const responseData = response.data as any;
      if (responseData?.data?.lesson_mapper && Object.keys(responseData.data.lesson_mapper).length > 0) {
        setLessonMapper(responseData.data.lesson_mapper as { [key: string]: string });
        console.log('[QuizSession] lesson_mapper 로드 성공');
      } else {
        console.warn('[QuizSession] lesson_mapper가 비어있음');
      }
    } catch (error) {
      console.error('[QuizSession] lesson_mapper 로드 실패:', error);
    }
  };

  // WebSocket 훅
  const { connectionStatus, wsList, broadcastMessage, sendMessage, connectToWebSockets } = useWebsocket();

  // 분류 로그 및 결과 수신 처리
  const [logs, setLogs] = useState<any[]>([]);
  const [displayConfidence, setDisplayConfidence] = useState<string>('');

  const { showStatus } = useGlobalWebSocketStatus();

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [currentResult, setCurrentResult] = useState<ClassificationResult | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [maxConfidence, setMaxConfidence] = useState(0.0);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { findCategoryById, findChapterById, findHierarchyByChapterId } = useLearningData();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [category, setCategory] = useState<any>(null);

  const [currentSignIndex, setCurrentSignIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [lessons, setLessons] = useState<any[]>([]);
  const currentSign = lessons[currentSignIndex];
  const currentSignId = lessons[currentSignIndex]?.id;
  const [isRecording, setIsRecording] = useState(false);

  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);

  // 퀴즈 타이머 관련 (위로 이동)
  const [timerActive, setTimerActive] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizResults, setQuizResults] = useState<{ signId: string, correct: boolean, timeSpent: number }[]>([]);
  const [isQuizReady, setIsQuizReady] = useState(false); // 퀴즈 준비 상태 추가
  const [timeSpent, setTimeSpent] = useState(0); // 실제 사용한 시간 추적

  const QUIZ_TIME_LIMIT = 15;

  // sessionComplete 시 소켓 연결 해제 및 결과 전송
  useEffect(() => {
    if (sessionComplete) {
      disconnectWebSockets();
      
      // 백엔드 퀴즈 제출 API 사용
      const results = quizResults.map(result => ({
        lessonId: result.signId,
        correct: result.correct,
        timeSpent: result.timeSpent
      }));
      
      API.post(`/quiz/chapter/${chapterId}/submit`, {
        results: results
      }).then((response: any) => {
        console.log('퀴즈 결과 제출 완료:', response.data);
        if (response.data.data.chapter_completed) {
          console.log('챕터 완료!');
        }
      }).catch((error) => {
        console.error('퀴즈 결과 제출 실패:', error);
      });
    }
  }, [sessionComplete, quizResults, chapterId]);

  const [isMovingNextSign, setIsMovingNextSign] = useState(false);
  const transmissionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const detectTimer = useRef<NodeJS.Timeout | null>(null);

  // 비디오 스트리밍 훅
  const {
    isStreaming,
    streamingStatus,
    currentStream,
    streamInfo,
    streamingConfig,
    streamingStats,
    startStreaming,
    stopStreaming,
    setStreamingConfig,
    handleStreamReady,
    handleStreamError,
  } = useVideoStreaming({
    connectionStatus,
    broadcastMessage,
    sendMessage,
    connectionId: currentConnectionId,
  });

  // 랜드마크 감지 시 호출되는 콜백
  const handleLandmarksDetected = useCallback((landmarks: LandmarksData) => {
    if (isRecording && isConnected) {
      // 랜드마크 감지 로그 (타이머 상태와 관계없이)
      setTransmissionCount(prev => prev + 1);
      console.log(`📤 랜드마크 감지됨 (${transmissionCount + 1})`);
    }
  }, [isRecording, isConnected, transmissionCount]);

  // SignClassifierClient는 사용하지 않으므로 연결 시도 제거

  // MediaPipe holistic hook 사용
  const {
    videoRef,
    canvasRef,
    isInitialized,
    isProcessing,
    lastLandmarks,
    startCamera,
    stopCamera,
    retryInitialization,
    error
  } = useMediaPipeHolistic({
    onLandmarks: handleLandmarksDetected,
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
    enableLogging: false
  });

  useEffect(() => {
    if (lastLandmarks) {
      const landmarksData = {
        type: 'landmarks',
        data: { pose: lastLandmarks.pose, left_hand: lastLandmarks.left_hand, right_hand: lastLandmarks.right_hand }
      };
      sendMessage(JSON.stringify(landmarksData), currentConnectionId);
    }
  }, [lastLandmarks, sendMessage, currentConnectionId]);

  // 이전 connectionId 추적을 위한 ref
  const prevConnectionIdRef = useRef<string>('');
  
  // connectionId 변경 시 비디오 스트리밍 갱신
  useEffect(() => {
    if (currentConnectionId &&
      currentConnectionId !== prevConnectionIdRef.current &&
      prevConnectionIdRef.current !== '') {

      console.log('[QuizSession] connectionId 변경 감지:', prevConnectionIdRef.current, '->', currentConnectionId);

      if (isStreaming) {
        console.log('[QuizSession] 스트리밍 재시작 시작');
        stopStreaming();

        const restartTimeout = setTimeout(() => {
          startStreaming();
          console.log('[QuizSession] 스트리밍 재시작 완료');
        }, 100);

        return () => clearTimeout(restartTimeout);
      } else {
        console.log('[QuizSession] 스트리밍 중이 아니므로 재시작하지 않음');
      }
    }

    if (currentConnectionId) {
      prevConnectionIdRef.current = currentConnectionId;
    }
  }, [currentConnectionId, startStreaming, stopStreaming]);

  useEffect(() => {
    return () => { 
      disconnectWebSockets();
    }
  }, []);

  // 녹화 시작 함수
  const handleStartRecording = () => {
    setIsRecording(true);
    setFeedback(null);
    setCurrentResult(null);
    console.log('🎬 수어 녹화 시작:', currentSign?.word);
  };

  // 다음 수어로 넘어가는 내용
  const handleNextSign = useCallback(async () => {
    console.log('🔄 다음 수어로 이동:', currentSignIndex + 1);
    setIsMovingNextSign(false);
    
    // 타이머 상태 초기화
    setTimerActive(false);
    setQuizStarted(false);
    setIsRecording(false);
    setIsQuizReady(false);
    
    if (lessons && currentSignIndex < lessons.length - 1) {
      setCurrentSignIndex(currentSignIndex + 1);
      setFeedback(null);
    } else {
      setSessionComplete(true);
    }
  }, [currentSignIndex, lessons]);

  // FeedbackDisplay 완료 콜백 함수
  const handleFeedbackComplete = () => {
    console.log('🎉 FeedbackDisplay 완료, 다음 수어로 이동');
    handleNextSign();
  };

  // 카메라 및 MediaPipe 초기화
  const initializeSession = async () => {
    if (!isInitialized) {
      console.log('⚠️ MediaPipe가 아직 초기화되지 않음');
      return false;
    }

    try {
      console.log('📹 카메라 시작 중...');
      const cameraStarted = await startCamera();

      if (cameraStarted) {
        console.log('✅ 세션 초기화 완료');
        return true;
      } else {
        console.log('[QuizSession] ❌ 카메라 시작 실패');
        return false;
      }
    } catch (error) {
      console.error('❌ 세션 초기화 실패:', error);
      return false;
    }
  };

  // 컴포넌트 마운트 시 자동 초기화
  useEffect(() => {
    const initialize = async () => {
      if (isInitialized) {
        console.log('🚀 자동 초기화 시작...');
        await initializeSession();
      }
    };

    initialize();

    return () => {
      stopCamera();
      if (transmissionIntervalRef.current) {
        clearInterval(transmissionIntervalRef.current);
      }
    };
  }, [isInitialized]);

  // 현재 수어에 대한 ws url 출력
  useEffect(() => {
    if (currentSignId) {
      console.log('[QuizSession] currentSignId:', currentSignId);
      const wsUrl = lesson_mapper[currentSignId] || '';
      setCurrentWsUrl(wsUrl);
      console.log('[QuizSession] currentWsUrl:', wsUrl);

      if (wsUrl) {
        // WebSocket 연결 시도
        console.log('[QuizSession] WebSocket 연결 시도:', wsUrl);
        connectToWebSockets([wsUrl]);
        
        // 연결 상태 확인
        const connection = getConnectionByUrl(wsUrl);
        if (connection) {
          setCurrentConnectionId(connection.id);
          setRetryAttempts(prev => ({ ...prev, wsConnection: 0 }));
          console.log('[QuizSession] currentConnectionId:', connection.id);
        } else {
          console.warn(`[QuizSession] No connection found for targetUrl: ${wsUrl}, 재시도 시작`);
          retryWsConnection(wsUrl);
        }
      } else {
        console.warn('[QuizSession] currentSignId에 대한 WebSocket URL이 없음:', currentSignId);
        // WebSocket 연결이 없어도 퀴즈는 진행 가능
        console.log('[QuizSession] WebSocket 없이 퀴즈 진행');
      }
    }
  }, [currentSignId, lesson_mapper, retryWsConnection, retryLessonMapper, connectToWebSockets]);

  // WebSocket 연결 상태 업데이트
  useEffect(() => {
    if (wsList && wsList.length > 0) {
      setIsConnected(true);
      setIsConnecting(false);
    } else {
      setIsConnected(false);
      setIsConnecting(true);
    }
  }, [wsList]);

  // WebSocket 메시지 처리
  useEffect(() => {
    if (wsList && wsList.length > 0) {
      const handlers: { ws: WebSocket; fn: (e: MessageEvent) => void }[] = [];
      setMaxConfidence(0);

      wsList.forEach(ws => {
        const handleMessage = (event: MessageEvent) => {
          try {
            const msg = JSON.parse(event.data);
            switch (msg.type) {
              case 'classification_result': {
                console.log('받은 분류 결과:', msg.data);
                
                // 퀴즈가 시작된 상태에서만 분류 결과 처리
                if (!timerActive) {
                  console.log('퀴즈가 시작되지 않았으므로 분류 결과 무시');
                  break;
                }
                
                if (feedback && msg.data.prediction === "None") {
                  setCurrentResult(msg.data);
                  break;
                }
                const { prediction, confidence, probabilities } = msg.data;
                const target = currentSign?.word;
                let percent: number | undefined = undefined;
                if (prediction === target) {
                  percent = confidence * 100;
                } else if (probabilities && target && probabilities[target] != null) {
                  percent = probabilities[target] * 100;
                }
                if (percent != null) {
                  setDisplayConfidence(`${percent.toFixed(1)}%`);
                }
                setCurrentResult(msg.data);
                
                // 퀴즈 모드에서 정답 판정 (80% 이상이면 정답)
                if (percent >= 80.0) {
                  console.log("✅ 정답! 시간 내에 성공");
                  setFeedback("correct");
                  studyListRef.current.push(currentSign.id);
                  
                  // 퀴즈 결과 저장 (정답)
                  if (currentSign) {
                    setQuizResults(prev => [...prev, {
                      signId: currentSign.id,
                      correct: true,
                      timeSpent: QUIZ_TIME_LIMIT - timeSpent
                    }]);
                  }
                  
                  // 정답 시 3초 후 다음 문제로 이동
                  setTimeout(() => {
                    handleNextSign();
                  }, 3000);
                }
                break;
              }
              default:
                break;
            }
          } catch (e) {
            console.error('WebSocket 메시지 파싱 오류:', e);
          }
        };
        ws.addEventListener('message', handleMessage);
        handlers.push({ ws, fn: handleMessage });
      });

      return () => {
        handlers.forEach(({ ws, fn }) => {
          ws.removeEventListener('message', fn);
        });
      };
    }
  }, [wsList]);

  // 챕터 아이디를 통해 챕터 첫 준비
  useEffect(() => {
    if (chapterId) {
      const loadChapter = async () => {
        try {
          const chapData = await findHierarchyByChapterId(chapterId);
          const categoryData = await findCategoryById(chapData.category_id);
          console.log(categoryData);
          console.log(chapData.lessons);
          setLessons(chapData.lessons);
          
          // lesson_mapper도 함께 로드
          if (chapData.lesson_mapper) {
            setLessonMapper(chapData.lesson_mapper);
            console.log('[QuizSession] lesson_mapper 로드됨:', chapData.lesson_mapper);
          } else {
            // lesson_mapper가 없으면 별도로 로드
            try {
              const mapperResponse = await API.get(`/chapters/${chapterId}/lesson_mapper`);
              if (mapperResponse.data && Object.keys(mapperResponse.data).length > 0) {
                setLessonMapper(mapperResponse.data as { [key: string]: string });
                console.log('[QuizSession] lesson_mapper 별도 로드 성공:', mapperResponse.data);
              }
            } catch (error) {
              console.error('[QuizSession] lesson_mapper 로드 실패:', error);
            }
          }
        } catch (error) {
          console.error('챕터 데이터 로드 실패:', error);
        }
      };
      loadChapter();
    }
  }, [categoryId, chapterId]);

  // 챕터 목록 준비 된 후 initialize
  useEffect(() => {
    setCurrentSignIndex(0);
    setFeedback(null);
    setCurrentResult(null);

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  // 퀴즈 타이머 관련 (중복 제거)

  // 시간 초과 시 호출
  const handleTimeUp = useCallback(() => {
    console.log('⏰ 시간 초과! 오답 처리');
    setIsRecording(false);
    setTimerActive(false);
    setFeedback('incorrect');

    if (currentSign) {
      setQuizResults(prev => [...prev, {
        signId: currentSign.id,
        correct: false,
        timeSpent: QUIZ_TIME_LIMIT
      }]);
    }

    // 3초 후 다음 문제로 이동
    setTimeout(() => {
      handleNextSign();
    }, 3000);
  }, [currentSign, handleNextSign]);

  // 퀴즈 시작 함수
  const handleStartQuiz = () => {
    if (currentSign) {
      console.log('🎯 퀴즈 시작:', currentSign.word);
      setQuizStarted(true);
      setIsQuizReady(true);
      setIsRecording(true);
      setTimeSpent(0); // 시간 리셋
      
      // 타이머 시작을 약간 지연시켜 상태 업데이트가 완료된 후 시작
      setTimeout(() => {
        setTimerActive(true);
        console.log('⏰ 타이머 활성화됨');
      }, 100);
    }
  };

  // 퀴즈 모드에서 새로운 문제가 시작될 때 자동으로 타이머 시작 (제거)
  // useEffect(() => {
  //   if (currentSign && !feedback) {
  //     setQuizStarted(true);
  //     setTimerActive(true);
  //     setIsRecording(true);

  //     const timer = setTimeout(() => {
  //       if (isRecording && timerActive) {
  //         handleTimeUp();
  //       }
  //     }, QUIZ_TIME_LIMIT * 1000);

  //     return () => clearTimeout(timer);
  //   }
  // }, [currentSignIndex, currentSign, feedback]);

  // 진행률 계산
  useEffect(() => {
    if (lessons && lessons.length > 0) {
      setProgress((currentSignIndex / lessons.length) * 100);
    }
  }, [currentSignIndex, lessons]);

  // 타이머 키 리셋은 handleNextSign에서만 처리

  // 최근 학습 반영: 세션 진입 시점에 호출
  useEffect(() => {
    if (lessons && lessons.length > 0) {
      const lessonIds = lessons.map(l => l.id);
      API.post('/progress/lessons/events', { lesson_ids: lessonIds });
    }
  }, [lessons]);

  if (sessionComplete) {
    const totalQuestions = lessons.length;
    const correctCount = quizResults.filter(result => result.correct).length;
    const wrongCount = totalQuestions - correctCount;
    
// 퀴즈 결과 데이터와 함께 SessionComplete 페이지로 이동
checkBadges("");
navigate(`/complete/chapter/${chapterId}/${2}`, {
  state: {
    totalQuestions: lessons.length,
    correctCount: quizResults.filter(result => result.correct).length,
    wrongCount: totalQuestions - correctCount
  }
})

}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 손 감지 상태 표시 인디케이터 */}
      <HandDetectionIndicator
        isHandDetected={isConnected}
        isConnected={isConnected}
        isStreaming={isStreaming}
      />

      <SessionHeader
        isQuizMode={true}
        currentSign={currentSign}
        chapter={chapter}
        currentSignIndex={currentSignIndex}
        progress={progress}
        categoryId={categoryId}
        navigate={navigate}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* 퀴즈 타이머 */}
          {isQuizReady && (
            <div className="mb-6">
              <QuizTimer
                duration={QUIZ_TIME_LIMIT}
                onTimeUp={handleTimeUp}
                isActive={timerActive}
                onTimeChange={setTimeSpent}
              />
            </div>
          )}
          
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
                
                {/* 시작 버튼 */}
                {!isQuizReady && currentSign && (
                  <Button 
                    onClick={handleStartQuiz}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold"
                  >
                    🎯 퀴즈 시작
                  </Button>
                )}
                
                {/* 퀴즈 진행 중 표시 */}
                {isQuizReady && (
                  <div className="text-green-600 font-semibold text-lg">
                    ⏱️ 퀴즈 진행 중...
                    {/* <Button 
                      onClick={handleTimeUp}
                      className="ml-4 bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-sm"
                    >
                      테스트: 시간 초과
                    </Button> */}
                  </div>
                )}
              </div>
            </div>

            {/* 웹캠 및 분류 결과 */}
            <div className="space-y-4">
              <VideoInput
                width={640}
                height={480}
                autoStart={true}
                showControls={true}
                onStreamReady={handleStreamReady}
                onStreamError={handleStreamError}
                className="h-full"
                currentSign={currentSign}
                currentResult={displayConfidence}
              />

              <StreamingControls
                isStreaming={isStreaming}
                streamingStatus={streamingStatus}
                streamingConfig={streamingConfig}
                currentStream={currentStream}
                connectionStatus={connectionStatus}
                onStartStreaming={startStreaming}
                onStopStreaming={stopStreaming}
                onConfigChange={setStreamingConfig}
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
              <div className="mb-2 text-sm text-gray-600">
                디버그: feedback={feedback}, prediction={currentResult?.prediction}
              </div>
              <FeedbackDisplay
                feedback={feedback}
                prediction={currentResult?.prediction}
                onComplete={feedback === 'correct' ? handleFeedbackComplete : undefined}
              />
            </div>
          )}
        </div>
      </main>

      {/* 통계 정보 */}
      <div className="mt-6 pt-4 border-t">
        <h3 className="font-semibold text-gray-700 mb-2">시스템 상태:</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">WebGL 지원:</span>
            <span className={`ml-2 ${webglSupported === null ? 'text-gray-600' :
                webglSupported ? 'text-green-600' : 'text-red-600'
              }`}>
              {webglSupported === null ? '확인 중' :
                webglSupported ? '지원됨' : '미지원'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">MediaPipe 상태:</span>
            <span className={`ml-2 ${isInitialized ? 'text-green-600' : 'text-yellow-600'}`}>
              {isInitialized ? '준비됨' : '초기화 중'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">전송된 랜드마크:</span>
            <span className="ml-2 font-mono">{transmissionCount}</span>
          </div>
          <div>
            <span className="text-gray-600">서버 연결:</span>
            <span className={`ml-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? '연결됨' : '끊김'}
            </span>
          </div>
        </div>
      </div>

      {/* 마지막 랜드마크 정보 */}
      {lastLandmarks && (
        <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
          <div className="font-semibold mb-1">마지막 랜드마크:</div>
          <div>포즈: {lastLandmarks.pose ? `${lastLandmarks.pose.length}개` : '없음'}</div>
          <div>왼손: {lastLandmarks.left_hand ? `${lastLandmarks.left_hand.length}개` : '없음'}</div>
          <div>오른손: {lastLandmarks.right_hand ? `${lastLandmarks.right_hand.length}개` : '없음'}</div>
        </div>
      )}

      {/* 미디어 파이프 홀리스틱 수동 초기화 */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
        <div className="font-semibold mb-1">미디어 파이프 홀리스틱 수동 초기화:</div>
        <div>
          <Button onClick={retryInitialization}>초기화 재시도</Button>
        </div>
      </div>
    </div>
  );
};

export default QuizSession;