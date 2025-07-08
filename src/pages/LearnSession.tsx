import { Button } from '@/components/ui/button';
import { Category, Chapter, Lesson } from '@/types/learning';
import { useLearningData } from '@/hooks/useLearningData';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useVideoStreaming } from '@/hooks/useVideoStreaming';
import { ClassificationResult } from '@/services/SignClassifierClient'; // 타입만 재사용
import { useGlobalWebSocketStatus } from '@/contexts/GlobalWebSocketContext';
import React, { useState, useRef, useEffect, useCallback, startTransition } from 'react';

import API from '@/components/AxiosInstance';
import useWebsocket, { getConnectionByUrl } from '@/hooks/useWebsocket';
import VideoInput from '@/components/VideoInput';
import SessionHeader from '@/components/SessionHeader';
import LearningDisplay from '@/components/LearningDisplay';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import StreamingControls from '@/components/StreamingControls';
import SessionInfo from '@/components/SessionInfo';
import SystemStatus from '@/components/SystemStatus';
import FeatureGuide from '@/components/FeatureGuide';

// 재시도 설정
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000, // 1초
  maxDelay: 5000, // 5초
};

const LearnSession = () => {
  const { categoryId, chapterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // URL state에서 lesson_mapper 가져오기
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

  // lesson_mapper 디버그 로그
  useEffect(() => {
    console.log('[LearnSession] lesson_mapper:', lesson_mapper);
    console.log('[LearnSession] lesson_mapper keys:', Object.keys(lesson_mapper));
    
    // lesson_mapper가 비어있으면 재시도
    if (Object.keys(lesson_mapper).length === 0 && !isRetrying) {
      console.log('[LearnSession] lesson_mapper가 비어있음, 재시도 시작');
      retryLessonMapper();
    }
  }, [lesson_mapper, isRetrying, retryLessonMapper]);

  // WebSocket 훅
  const { connectionStatus, wsList, broadcastMessage, sendMessage } = useWebsocket();

  // 분류 로그 및 결과 수신 처리
  const [logs, setLogs] = useState<any[]>([]);
  const [displayConfidence, setDisplayConfidence] = useState<string>('');

  const { showStatus } = useGlobalWebSocketStatus();

  const [isConnected, setIsConnected] = useState<boolean>(false); // 초기값에 의해 타입 결정됨.
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [currentResult, setCurrentResult] = useState<string | null>(null); // 이 경우는 포인터 변수
  const [isConnecting, setIsConnecting] = useState(false);
  const [maxConfidence, setMaxConfidence] = useState(0.0);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  //const {findCategoryById, findChapterById, addToReview, markSignCompleted, markChapterCompleted, markCategoryCompleted, getChapterProgress } = useLearningData();
  const { findCategoryById, findChapterById, findHierarchyByChapterId } = useLearningData();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [category, setCategory] = useState<Category | null>(null);

  const [animData, setAnimData] = useState(null);
  const [currentFrame, setCurrentFrame] = useState(0);

  const [currentSignIndex, setCurrentSignIndex] = useState(0);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const currentSign = lessons[currentSignIndex];
  const currentSignId = lessons[currentSignIndex]?.id;
  const [isRecording, setIsRecording] = useState(false);

  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);

  //const category = categoryId ? findCategoryById(categoryId) : null;
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
    canvasRef,
    videoRef,
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

  // 이전 connectionId 추적을 위한 ref
  const prevConnectionIdRef = useRef<string>('');

  // connectionId 변경 시 비디오 스트리밍 갱신
  useEffect(() => {
    // 실제로 connectionId가 변경되었을 때만 처리
    if (currentConnectionId && 
        currentConnectionId !== prevConnectionIdRef.current && 
        prevConnectionIdRef.current !== '') {
      
      console.log('[LearnSession] connectionId 변경 감지:', prevConnectionIdRef.current, '->', currentConnectionId);
      
      // 스트리밍 중일 때만 재시작
      if (isStreaming) {
        console.log('[LearnSession] 스트리밍 재시작 시작');
        
        // 기존 스트리밍 중지 후 새 connectionId로 재시작
        stopStreaming();
        
        // 잠시 대기 후 재시작 (연결 정리 시간 확보)
        const restartTimeout = setTimeout(() => {
          startStreaming();
          console.log('[LearnSession] 스트리밍 재시작 완료');
        }, 100);
        
        return () => clearTimeout(restartTimeout);
      } else {
        console.log('[LearnSession] 스트리밍 중이 아니므로 재시작하지 않음');
      }
    }
    
    // connectionId 업데이트
    if (currentConnectionId) {
      prevConnectionIdRef.current = currentConnectionId;
    }
  }, [currentConnectionId, startStreaming, stopStreaming]);

  // 이벤트 핸들러
  const handleBack = () => {
    window.history.back();
  };

  // 이 함수로, 실질적인 컨텐츠 타이머 시작
  const handleStartRecording = () => {
    setIsRecording(true);
    setFeedback(null);
    setCurrentResult(null); // 이전 분류 결과 초기화
    console.log('🎬 수어 녹화 시작:', currentSign?.word);
  };

  // 다음 수어(레슨)으로 넘어가는 내용 [완료]
  const handleNextSign = async () => {
    setIsMovingNextSign(false);
    if (lessons && currentSignIndex < lessons.length - 1) {
      setCurrentSignIndex(currentSignIndex + 1);
      setFeedback(null);
    } else {
      setSessionComplete(true);
    }
  };

  // FeedbackDisplay 완료 콜백 함수. Feedback 복구 시 해당 메서드 실행하게끔 조치
  const handleFeedbackComplete = () => {
    setFeedback("correct");
    console.log('🎉 FeedbackDisplay 완료, 다음 수어로 이동');

    handleNextSign();
  };

  // 애니메이션 재생 루틴 [완료]
  const loadAnim = async () => {
    try {
      const id = currentSign.id;
      console.log(id);
      const response = await API.get(`/anim/${id}`);
      setAnimData(response.data);
    } catch (error) {
      console.error('애니메이션 불러오는데 실패했습니다 : ', error);
    }
  };

  const poseLength = animData && animData.pose ? animData.pose.length : 0;

  // 수어 변경 시점마다 애니메이션 자동 변경 [완료]
  useEffect(() => {
    loadAnim();
  }, [currentSign]);

  // 애니메이션 자동 재생 처리 및 프레임 조절 [완료]
  useEffect(() => {
    if (animData) {
      animationIntervalRef.current = setInterval(() => {
        if (currentFrame < animData.pose.length - 1) {
          setCurrentFrame(prev => prev + 1);
        } else {
          setCurrentFrame(0);
        }
      }, 1000 / 30);
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
  }, [animData, currentFrame]);

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
             console.log('받은 분류 결과:', msg.data);
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
}, [wsList]);


  // 챕터 아이디를 통해 챕터 첫 준비 [완료]
  useEffect(() => {
    if (chapterId) {
      const loadChapter = async () => {
        try {
          const chapData = await findHierarchyByChapterId(chapterId);
          const categoryData = await findCategoryById(chapData.category_id);
          console.log(categoryData);
        
         console.log(chapData.lessons);
          setLessons(chapData.lessons);
          //setCategory(hierachy)
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

   
    // 컴포넌트 언마운트 시 정리 작업 실시 
    return () => {
  //   signClassifierClient.disconnect();
      //stopStream();
      // if (transmissionIntervalRef.current) {
      //   clearInterval(transmissionIntervalRef.current);
      // }
      
      // 재시도 타이머 정리
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);






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
        {<LearningDisplay
          data={animData}
          currentFrame={currentFrame}
          totalFrame={150}
        />}
          <div className="mt-4 p-3 bg-gray-100 rounded-md">


     

          {/* 비디오 입력 영역 */}
          <div className="space-y-4">
            <VideoInput
              width={640}
              height={480}
              autoStart={false}
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
        <Button onClick={handleNextSign}>[DEBUG] 챕터 내 다음 내용으로 넘어가기</Button>
      </div>
      </div>
  );
};

export default LearnSession;


