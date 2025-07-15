import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  CheckCircle,
  BookOpen
} from 'lucide-react';
 
import ExampleAnim from '@/components/ExampleAnim';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import API from "@/components/AxiosInstance";
import { useLearningData } from '@/hooks/useLearningData';
import { Lesson as LessonBase } from '@/types/learning';
import VideoInput from '@/components/VideoInput';
import { useMediaPipeHolistic } from '@/hooks/useMediaPipeHolistic';
import FeedbackModalForLearn from '@/components/FeedbackModalForLearn';
import LearningDisplay from '@/components/LearningDisplay';
import useWebsocket, { getConnectionByUrl, disconnectWebSockets } from '@/hooks/useWebsocket';
import { ClassificationResult, signClassifierClient, LandmarksData } from '@/services/SignClassifierClient';
import StreamingControls from '@/components/StreamingControls';
import SessionHeader from '@/components/SessionHeader';
import { update } from 'lodash';

interface Lesson extends LessonBase {
  sign_text?: string;
  media_url?: string;
  chapter_id?: string;
}

const CORRECT_TARGET = 3;

const Learn = () => {
  const [isRecording, setIsRecording] = useState(true); // 진입 시 바로 분류 시작
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const exampleVideoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isSlowMotion, setIsSlowMotion] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [displayConfidence, setDisplayConfidence] = useState<string>('');
  const [transmissionCount, setTransmissionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isWaitingForReset, setIsWaitingForReset] = useState(false);
  const location = useLocation();
  const [lesson_mapper, setLessonMapper] = useState<{ [key: string]: string }>(location.state?.lesson_mapper || {});

  const navigate = useNavigate();
  const { lessonId } = useParams();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(true);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [wsUrlLoading, setWsUrlLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [retryAttempts, setRetryAttempts] = useState({
    lessonMapper: 0,
    wsConnection: 0,
  });
  const [currentConnectionId, setCurrentConnectionId] = useState<string>('');
  const [currentWsUrl, setCurrentWsUrl] = useState<string>('');
  const [currentSignIndex, setCurrentSignIndex] = useState(0);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const currentSignId = lessons[currentSignIndex]?.id;
  const [isBufferingPaused, setIsBufferingPaused] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean>(false); // 초기값에 의해 타입 결정됨.
  const { connectionStatus, wsList, sendMessage } = useWebsocket();
  const currentSign = lesson?.sign_text;

  // 재시도 설정
  const RETRY_CONFIG = {
    maxAttempts: 3,
    initialDelay: 1000, // 1초
    maxDelay: 5000, // 5초
  };
  const [maxConfidence, setMaxConfidence] = useState(0.0);
  const studyListRef = useRef<string[]>([]);

  const [landmarksBuffer, setLandmarksBuffer] = useState<LandmarksData[]>([]);
  const bufferIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const BUFFER_DURATION = 1000; // 2초

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
                const target = lesson?.sign_text;
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
                  studyListRef.current.push(lesson?.id);
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

const updateVideoProgress = () => {
  if (exampleVideoRef.current) {
    const currentTime = exampleVideoRef.current.currentTime;
    const duration = exampleVideoRef.current.duration;
    
    // NaN 체크 추가
    if (!isNaN(currentTime) && !isNaN(duration) && duration > 0) {
      const progress = (currentTime / duration) * 100;
      setVideoProgress(progress);
    }
  } else {
    console.log('exampleVideoRef.current is null');
  }
};


  // 랜드마크 감지 시 호출되는 콜백 (useCallback으로 먼저 정의)
  const handleLandmarksDetected = useCallback((landmarks: LandmarksData) => {
    // 녹화 중일 때만 버퍼에 추가
    if (isRecording && isConnected) {
      console.log("✅ 랜드마크 감지됨");
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
    startCamera,
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
              console.log('🔄 랜드마크 시퀀스 전송됨 (1초 간격)');
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

  // MediaPipe 초기화 후 카메라 자동 시작
  useEffect(() => {
    if (isInitialized && !isCompleted) {
      console.log('🎥 MediaPipe 초기화 완료, 카메라 시작...');
      startCamera().then(success => {
        if (success) {
          console.log('✅ 카메라 시작 성공');
        } else {
          console.error('❌ 카메라 시작 실패');
        }
      });
    }
  }, [isInitialized, isCompleted, startCamera]);

  //===============================================

  // lesson fetch (chapter_id 포함)
  useEffect(() => {
    if (!lessonId) return;
    setLessonLoading(true);
    setLessonError(null);
    API.get<{ success: boolean; data: Lesson; message?: string }>(`/lessons/${lessonId}`)
      .then(res => {
        const data = res.data.data;
        // word가 없고 sign_text가 있으면 word에 sign_text를 할당
        if (!data.word && data.sign_text) {
          data.word = data.sign_text;
        }
        setLesson(data);
        setLessonLoading(false);
      })
      .catch((err) => {
        setLesson(null);
        setLessonLoading(false);
        setLessonError('존재하지 않는 수어입니다');
      });
  }, [lessonId]);

  // 단일 레슨용 wsUrl fetch
  useEffect(() => {
    if (!lessonId) return;
    setWsUrlLoading(true);
    API.get<{ success: boolean; data: { ws_url: string }; message?: string }>(`/ml/deploy/lesson/${lessonId}`)
      .then(res => {
        setWsUrl(res.data.data.ws_url);
        setWsUrlLoading(false);
      })
      .catch(() => {
        setWsUrl(null);
        setWsUrlLoading(false);
      });
  }, [lessonId]);


  // 애니메이션 데이터 로딩
  useEffect(() => {
    const loadAnim = async () => {
      try {
        const response = await API.get(`/anim/${lessonId}`, {
          responseType: 'blob'
        });
        const videoBlob = new Blob([response.data as BlobPart], { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(videoBlob);

        if (videoSrc) {
          URL.revokeObjectURL(videoSrc);
        }
        setVideoSrc(videoUrl);
      } catch (error) {
        console.error('애니메이션 불러오는데 실패했습니다 : ', error);
      }
    };
    if (lessonId) loadAnim();
  }, [lessonId]);

const togglePlaybackSpeed = () => {
  setIsSlowMotion(prev => !prev);
};

useEffect(() => {
  const videoElement = document.querySelector('video[src]') as HTMLVideoElement;
  if (videoElement) {
    videoElement.playbackRate = isSlowMotion ? 0.5 : 1.0;
  }
}, [isSlowMotion, videoSrc]);
  // 분류 결과 처리: 정답이면 카운트 증가, 3회 이상이면 완료
  useEffect(() => {
    if (!wsUrl) return;
    if (wsList && wsList.length > 0) {
      const handlers = wsList.map(ws => {
        const fn = (event: MessageEvent) => {
          try {
            const msg = JSON.parse(event.data);
            if (feedback !== null) return; // 모달 떠 있으면 결과 무시
            if (msg.type === 'classification_result') {
              setCurrentResult(msg.data);
              const { prediction, confidence, probabilities } = msg.data;
              const target = lesson?.sign_text;
              let percent: number | undefined = undefined;
              if (prediction === target) {
                percent = confidence * 100;
              } else if (probabilities && target && probabilities[target] != null) {
                percent = probabilities[target] * 100;
              }
              if (percent != null) {
                setDisplayConfidence(`${percent.toFixed(1)}%`);
              }
              // 정답 시
              if (percent != null && percent >= 80.0 && prediction === target && feedback !== 'correct') {
                setFeedback('correct');
                setIsRecording(false); // 분류 멈춤, 캠은 계속
              } else if (
                prediction && prediction !== target && prediction !== 'None' && percent != null && percent >= 80.0 && feedback !== 'incorrect'
              ) {
                // None이 아니고, 정답도 아니고, 신뢰도 80% 이상일 때만 오답
                setFeedback('incorrect');
                setIsRecording(false);
              }
            }
          } catch (e) { }
        };
        ws.addEventListener('message', fn);
        return { ws, fn };
      });
      return () => {
        handlers.forEach(({ ws, fn }) => ws.removeEventListener('message', fn));
      };
    }
  }, [wsList, wsUrl, lesson, feedback]);

  // 정답/오답 피드백이 닫힐 때 처리 (모든 상태 전이 담당)
  const handleFeedbackComplete = useCallback(() => {
    setCorrectCount(prev => {
      let next = prev;
      if (feedback === 'correct') next = prev + 1;
      return next;
    });
    setFeedback(null);
    setCurrentResult(null);
    if (feedback === 'correct') {
      setIsWaitingForReset(true); // 정답 후에는 리셋 대기
      setIsRecording(true);
    }
  }, [feedback]);

  // 정답/오답 모달이 뜨면 3초(정답) 또는 2초(오답) 뒤 자동으로 닫힘
  useEffect(() => {
    if (feedback === 'correct' || feedback === 'incorrect') {
      const timer = setTimeout(() => {
        handleFeedbackComplete();
      }, feedback === 'correct' ? 3000 : 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback, handleFeedbackComplete]);

  // 정답 3회 시 완료 처리
  useEffect(() => {
    if (correctCount >= CORRECT_TARGET) {
      setIsCompleted(true);
      setIsRecording(false);
      setFeedback(null);
      setCurrentResult(null);
      setIsWaitingForReset(false);

    } else if (!isCompleted && feedback === null && !isWaitingForReset) {
      // 3회 미만이고 모달이 닫혔으며, 리셋 대기가 아닐 때만 분류 재시작
      setIsRecording(true);
    }
  }, [correctCount, isCompleted, feedback, isWaitingForReset]);

  // 다시하기 핸들러
  const handleRetry = () => {
    setCorrectCount(0);
    setIsCompleted(false);
    setFeedback(null);
    setCurrentResult(null);
    setIsRecording(true);
    setIsWaitingForReset(false);
  };

  const handleGoHome = () => {
    disconnectWebSockets();
    console.log("HOME DONE..?");
    navigate('/home');
  };

  // 데이터 로딩/에러 처리
  if (lessonLoading || wsUrlLoading) {
    return <div className="text-center mt-10">수어 정보를 불러오는 중입니다...</div>;
  }
  if (lessonError) {
    return <div className="text-center mt-10 text-red-500">{lessonError}</div>;
  }

  // 완료 화면
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/home')}
                  className="hover:bg-blue-50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  홈으로
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{lesson?.sign_text ?? lessonId ?? ''}</h1>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center py-12">
            <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">학습 완료!</h2>
            <p className="text-gray-600 mb-6">'{lesson?.sign_text ?? lessonId}' 수어를 성공적으로 3회 따라했습니다.</p>
            <div className="flex justify-center space-x-4">
              <Button onClick={handleRetry} variant="outline">
                다시하기
              </Button>
              <Button onClick={handleGoHome} className="bg-blue-600 hover:bg-blue-700">
                홈으로 돌아가기
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SessionHeader
        isQuizMode={false}
        currentSign={"쑤퍼노바"}
        chapter={"chaptar"}
        currentSignIndex={1}
        progress={1}
        categoryId={undefined}
        navigate={navigate}
      />

      <div className="grid lg:grid-cols-2 gap-12">
        {videoSrc ? (
                         <div className="relative">
<video
  ref={exampleVideoRef}
  src={videoSrc}
  autoPlay
  loop
  muted
  playsInline
  className="w-full h-auto"
  onTimeUpdate={updateVideoProgress}
/>
  
  {/* 프로그레스 바 */}
  <div className="w-full h-1 bg-gray-200 mt-2">
    <div 
      className="h-full bg-blue-500 transition-all duration-300"
      style={{ width: `${videoProgress}%` }}
    ></div>
  </div>
</div>


          
        ) : (
          <div className="flex items-center justify-center h-64 bg-gray-200 rounded">
            <p>비디오 로딩 중...</p>
          </div>
        )}
        <div className="mt-4 p-3 bg-gray-100 rounded-md">

          {/* 비디오 입력 영역 */}
          <div className="space-y-4">
            <VideoInput
              width={640}
              height={480}
              autoStart={true}
              showControls={true}
              className="h-full"
              currentSign={lesson}
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
              prediction={currentResult.prediction}
              onComplete={feedback === 'correct' ? handleFeedbackComplete : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Learn;


