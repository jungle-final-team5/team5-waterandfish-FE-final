import { useState, useEffect, useRef, useCallback } from 'react';
import { signClassifierClient, ClassificationResult, LandmarksData } from '../services/SignClassifierClient';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLearningData } from '@/hooks/useLearningData';
import { useVideoStreaming } from '@/hooks/useVideoStreaming';
import { useMediaPipeHolistic } from '@/hooks/useMediaPipeHolistic';
import { useGlobalWebSocketStatus } from '@/contexts/GlobalWebSocketContext';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import QuizTimer from '@/components/QuizTimer';
import SessionHeader from '@/components/SessionHeader';
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
  const studyListRef = useRef<string[]>([]);

  // WebSocket 훅
  const { connectionStatus, wsList, sendMessage } = useWebsocket();

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
  const [isBufferingPaused, setIsBufferingPaused] = useState(false);
  // 랜드마크 버퍼링 관련 상태
  const [landmarksBuffer, setLandmarksBuffer] = useState<LandmarksData[]>([]);
  const bufferIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const BUFFER_DURATION = 1000; // 2초
  const QUIZ_TIME_LIMIT = 15;

  //===============================================
  // 분류 서버 관련 훅
  //===============================================

  // lesson_mapper 재시도 함수
  const retryLessonMapper = useCallback(async () => {
    if (retryAttempts.lessonMapper >= RETRY_CONFIG.maxAttempts) {
      console.error('[LearnSession] lesson_mapper 재시도 횟수 초과');
      alert('데이터를 불러오는데 실패했습니다. 페이지를 새로고침하거나 다시 시도해주세요.');
      setIsRetrying(false);
      return;
    }

    setIsRetrying(true);
    const delay = Math.min(
      RETRY_CONFIG.initialDelay * Math.pow(2, retryAttempts.lessonMapper),
      RETRY_CONFIG.maxDelay
    );

    console.log(`[LearnSession] lesson_mapper 재시도 ${retryAttempts.lessonMapper + 1}/${RETRY_CONFIG.maxAttempts} (${delay}ms 후)`);

    retryTimeoutRef.current = setTimeout(() => {
      // 이전 페이지로 돌아가서 다시 데이터 받아오기
      if (location.state?.lesson_mapper && Object.keys(location.state.lesson_mapper).length > 0) {
        setLessonMapper(location.state.lesson_mapper);
        setRetryAttempts(prev => ({ ...prev, lessonMapper: 0 }));
        // WebSocket 연결도 성공했거나 재시도가 필요없으면 전체 재시도 상태 해제
        if (retryAttempts.wsConnection === 0 && currentConnectionId) {
          setIsRetrying(false);
        }
        console.log('[LearnSession] lesson_mapper 재시도 성공');
      } else {
        setRetryAttempts(prev => ({ ...prev, lessonMapper: prev.lessonMapper + 1 }));
        retryLessonMapper();
      }
    }, delay);
  }, [retryAttempts.lessonMapper, retryAttempts.wsConnection, location.state, currentConnectionId]);

  // WebSocket 연결 재시도 함수
  const retryWsConnection = useCallback(async (targetUrl: string) => {
    if (retryAttempts.wsConnection >= RETRY_CONFIG.maxAttempts) {
      console.error('[LearnSession] WebSocket 연결 재시도 횟수 초과');
      alert('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
      navigate("/");
      setIsRetrying(false);
      return;
    }

    setIsRetrying(true);
    const delay = Math.min(
      RETRY_CONFIG.initialDelay * Math.pow(2, retryAttempts.wsConnection),
      RETRY_CONFIG.maxDelay
    );

    console.log(`[LearnSession] WebSocket 연결 재시도 ${retryAttempts.wsConnection + 1}/${RETRY_CONFIG.maxAttempts} (${delay}ms 후)`);

    retryTimeoutRef.current = setTimeout(() => {
      const connection = getConnectionByUrl(targetUrl);
      if (connection) {
        setCurrentConnectionId(connection.id);
        setRetryAttempts(prev => ({ ...prev, wsConnection: 0 }));
        // lesson_mapper도 성공했거나 재시도가 필요없으면 전체 재시도 상태 해제
        if (retryAttempts.lessonMapper === 0 && Object.keys(lesson_mapper).length > 0) {
          setIsRetrying(false);
        }
        console.log('[LearnSession] WebSocket 연결 재시도 성공:', connection.id);
      } else {
        setRetryAttempts(prev => ({ ...prev, wsConnection: prev.wsConnection + 1 }));
        retryWsConnection(targetUrl);
      }
    }, delay);
  }, [retryAttempts.wsConnection, retryAttempts.lessonMapper, lesson_mapper]);

  // WebSocket 연결 상태 모니터링
  useEffect(() => {
    // connectionStatus가 변경될 때마다 isConnected 업데이트
    const isWsConnected = connectionStatus === 'connected' && wsList.length > 0;
    setIsConnected(isWsConnected);
    console.log(`🔌 WebSocket 연결 상태: ${connectionStatus}, 연결된 소켓: ${wsList.length}개, isConnected: ${isWsConnected}`);
  }, [connectionStatus, wsList.length]);

  // 이전 connectionId 추적을 위한 ref
  const prevConnectionIdRef = useRef<string>('');

  // connectionId 변경 시 비디오 스트리밍 갱신
  useEffect(() => {
    // 실제로 connectionId가 변경되었을 때만 처리
    if (currentConnectionId &&
      currentConnectionId !== prevConnectionIdRef.current &&
      prevConnectionIdRef.current !== '') {
      console.log('[LearnSession] connectionId 변경 감지:', prevConnectionIdRef.current, '->', currentConnectionId);
    }
    // connectionId 업데이트
    if (currentConnectionId) {
      prevConnectionIdRef.current = currentConnectionId;
    }
  }, [currentConnectionId]);

  // 현재 수어에 대한 ws url 출력
  useEffect(() => {
    if (currentSignId) {
      console.log('[LearnSession] currentSignId:', currentSignId);
      const wsUrl = lesson_mapper[currentSignId] || '';
      setCurrentWsUrl(wsUrl);
      console.log('[LearnSession] currentWsUrl:', wsUrl);

      if (wsUrl) {
        const connection = getConnectionByUrl(wsUrl);
        if (connection) {
          setCurrentConnectionId(connection.id);
          setRetryAttempts(prev => ({ ...prev, wsConnection: 0 })); // 성공 시 재시도 카운터 리셋
          console.log('[LearnSession] currentConnectionId:', connection.id);
        } else {
          console.warn(`[LearnSession] No connection found for targetUrl: ${wsUrl}, 재시도 시작`);
          retryWsConnection(wsUrl);
        }
      } else {
        console.warn('[LearnSession] currentSignId에 대한 WebSocket URL이 없음:', currentSignId);
        // lesson_mapper에 해당 ID가 없으면 lesson_mapper 재시도
        if (Object.keys(lesson_mapper).length === 0) {
          retryLessonMapper();
        }
      }
    }
  }, [currentSignId, lesson_mapper, retryWsConnection, retryLessonMapper]);

  // 소켓 메시지 수신 처리
  useEffect(() => {
    if (wsList && wsList.length > 0) {
      // 각 소켓에 대해 핸들러 등록
      const handlers: { ws: WebSocket; fn: (e: MessageEvent) => void }[] = [];
      setMaxConfidence(0);

      wsList.forEach(ws => {
        const handleMessage = (event: MessageEvent) => {
          try {
            const msg = JSON.parse(event.data);
            switch (msg.type) {
              case 'classification_result': {

                // 버퍼링 일시정지 중에 None 감지 시 버퍼링 재개
                if (isBufferingPaused && msg.data && msg.data.prediction !== "None") {
                  setDisplayConfidence("빠른 동작 감지");
                  return;
                } else if (isBufferingPaused && msg.data && msg.data.prediction === "None") {
                  setIsBufferingPaused(false);
                  return;
                }


                console.log('받은 분류 결과:', msg.data);
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
                if (percent >= 80.0) {
                  setFeedback("correct");
                  studyListRef.current.push(currentSign.id);
                  console.log("PASSED");
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

      // 정리: 컴포넌트 언마운트 혹은 wsList 변경 시 리스너 해제
      return () => {
        handlers.forEach(({ ws, fn }) => {
          ws.removeEventListener('message', fn);
        });
      };
    }
  }, [wsList, isBufferingPaused]);
  //===============================================

  //===============================================
  // 랜드마크 버퍼링 및 전송 처리
  //===============================================

  const [isMovingNextSign, setIsMovingNextSign] = useState(false);
  const transmissionIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
  }, [isRecording, isConnected, currentConnectionId, sendMessage, isBufferingPaused, currentResult]);

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

  // connectionId 변경 시 
  useEffect(() => {
    if (currentConnectionId &&
      currentConnectionId !== prevConnectionIdRef.current &&
      prevConnectionIdRef.current !== '') {
      console.log('[QuizSession] connectionId 변경 감지:', prevConnectionIdRef.current, '->', currentConnectionId);
    }
    if (currentConnectionId) {
      prevConnectionIdRef.current = currentConnectionId;
    }
  }, [currentConnectionId]);

  useEffect(() => {
    return () => {
      disconnectWebSockets();
    }
  }, []);

  //===============================================
  // 퀴즈 관련 처리
  //===============================================

const beforeNavigate = useCallback(async () => {
      
      disconnectWebSockets();

      // 백엔드 퀴즈 제출 API 사용
      const results = quizResults.map(result => ({
        lessonId: result.signId,
        correct: result.correct,
        timeSpent: result.timeSpent
      }));
      console.log("run!");
      console.log(results);

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
    
}, [sessionComplete, quizResults, chapterId]);

// handleNextSign 함수 수정
const handleNextSign = useCallback(async (latestResults = quizResults) => {
  console.log('🔄 다음 수어로 이동:', currentSignIndex + 1);
  console.log('현재 퀴즈 결과:', latestResults);
  
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
      disconnectWebSockets();
    // 백엔드 퀴즈 제출 API 사용 (최신 결과 사용)
    try {
      const results = latestResults.map(result => ({
        lessonId: result.signId,
        correct: result.correct,
        timeSpent: result.timeSpent
      }));
      console.log("yo");
      console.log(results);
      await API.post(`/quiz/chapter/${chapterId}/submit`, {
        results: results
      });
      console.log('퀴즈 결과 제출 완료');
    } catch (error) {
      console.error('퀴즈 결과 제출 실패:', error);
    }
  }
}, [currentSignIndex, lessons, chapterId]);

  // FeedbackDisplay 완료 콜백 함수
  const handleFeedbackComplete = () => {
    console.log('🎉 FeedbackDisplay 완료, 다음 수어로 이동');
    handleNextSign();
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
      }
    }
  }, [currentSignId, lesson_mapper, retryWsConnection, retryLessonMapper]);

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
                  setTimerActive(false);
                  setFeedback("correct");
                  studyListRef.current.push(currentSign.id);

                  

                  // 퀴즈 결과 저장 (정답)
                  if (currentSign) {
    // 새 결과 객체 생성
    const newResult = {
      signId: currentSign.id,
      correct: true,
      timeSpent: QUIZ_TIME_LIMIT - timeSpent
    };
    
    // 상태 업데이트와 동시에 로컬 변수에도 저장
    setQuizResults(prev => {
      const updatedResults = [...prev, newResult];
      
      // 상태 업데이트 후 3초 뒤에 다음 문제로 이동
      setTimeout(() => {
        console.log("업데이트된 퀴즈 결과 (정답):", updatedResults);
        handleNextSign(updatedResults); // 업데이트된 결과를 인자로 전달
      }, 3000);
      
      return updatedResults;
    });
  }
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
    
    console.log(currentSign.id);
    console.log("틀린거 저장 완료하다");
  }
}, [currentSign]);

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

  useEffect(() => {
    if (currentResult) {
      if (!quizStarted) {
        handleStartQuiz();
      }
    }
    else {
      setDisplayConfidence('인식이 시작되면 퀴즈가 시작됩니다.');
    }
  }, [currentResult, quizStarted]);

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
      API.post('/progress/lessons/events', { lesson_ids: lessonIds, mode: 'quiz' });
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

                {/* 퀴즈 진행 중 표시 */}
                {isQuizReady && (
                  <div className="text-green-600 font-semibold text-lg">
                    ⏱️ 퀴즈 진행 중...
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
                className="h-full"
                currentSign={currentSign}
                currentResult={displayConfidence}
              />

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
    </div>
  );
};

export default QuizSession;