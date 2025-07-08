import { Button } from '@/components/ui/button';
import { Category, Chapter, Lesson } from '@/types/learning';
import { useVideoStream } from '@/hooks/useVideoStream';
import { useLearningData } from '@/hooks/useLearningData';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useVideoStreaming } from '@/hooks/useVideoStreaming';
import { ClassificationResult } from '@/services/SignClassifierClient'; // 타입만 재사용
import { useGlobalWebSocketStatus } from '@/contexts/GlobalWebSocketContext';
import React, { useState, useRef, useEffect, useCallback, startTransition } from 'react';

import API from '@/components/AxiosInstance';
import useWebsocket from '@/hooks/useWebsocket';
import VideoInput from '@/components/VideoInput';
import SessionHeader from '@/components/SessionHeader';
import LearningDisplay from '@/components/LearningDisplay';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import StreamingControls from '@/components/StreamingControls';
import SessionInfo from '@/components/SessionInfo';
import SystemStatus from '@/components/SystemStatus';
import FeatureGuide from '@/components/FeatureGuide';


const LearnSession = () => {
  const { categoryId, chapterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // URL state에서 lesson_mapper 가져오기
  const [lesson_mapper, setLessonMapper] = useState<{ [key: string]: string }>(location.state?.lesson_mapper || {});
  
  // lesson_mapper 디버그 로그
  useEffect(() => {
    console.log('[LearnSession] lesson_mapper:', lesson_mapper);
    console.log('[LearnSession] lesson_mapper keys:', lesson_mapper);
  }, [lesson_mapper]);

  // WebSocket 훅
  const { connectionStatus, wsList, broadcastMessage } = useWebsocket();

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
  });

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

  useEffect(() => {
    if (currentSignId) {
      console.log('[LearnSession] currentSignId:', currentSignId);
      console.log('[LearnSession] current ws url :', lesson_mapper[currentSignId]);
    }
  }, [currentSignId]);

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


