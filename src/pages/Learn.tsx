import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  CheckCircle,
  BookOpen
} from 'lucide-react';
import WebcamView from '@/components/WebcamView';
import ExampleAnim from '@/components/ExampleAnim';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import API from "@/components/AxiosInstance";
import { useLearningData } from '@/hooks/useLearningData';
import { Lesson as LessonBase } from '@/types/learning';
import VideoInput from '@/components/VideoInput';
import useWebsocket, { connectToWebSockets, disconnectWebSockets } from '@/hooks/useWebsocket';
import { useMediaPipeHolistic } from '@/hooks/useMediaPipeHolistic';
import FeedbackModalForLearn from '@/components/FeedbackModalForLearn';
import LearningDisplay from '@/components/LearningDisplay';

interface Lesson extends LessonBase {
  sign_text?: string;
  media_url?: string;
  chapter_id?: string;
}

const CORRECT_TARGET = 3;

const Learn = () => {
  const [isRecording, setIsRecording] = useState(true); // 진입 시 바로 분류 시작
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [isSlowMotion, setIsSlowMotion] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [displayConfidence, setDisplayConfidence] = useState<string>('');
  const [transmissionCount, setTransmissionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isWaitingForReset, setIsWaitingForReset] = useState(false);

  const navigate = useNavigate();
  const { lessonId } = useParams();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(true);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [wsUrlLoading, setWsUrlLoading] = useState(false);

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

  // wsUrl이 준비된 후에만 웹소켓 연결
  useEffect(() => {
    if (wsUrl) {
      connectToWebSockets([wsUrl]);
    }
  }, [wsUrl]);
  const { connectionStatus, wsList, sendMessage } = useWebsocket();

  // 애니메이션 데이터 로딩
  useEffect(() => {
  
    const loadAnim = async () => {
      try {
          const response = await API.get(`/anim/${lessonId}`, {
        responseType: 'blob'
      });
    const videoBlob = new Blob([response.data], {type: 'video/webm'});
      const videoUrl = URL.createObjectURL(videoBlob);

      if(videoSrc)
      {
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

  // MediaPipe + WebSocket 연동
  const handleLandmarksDetected = useCallback((landmarks: any) => {
    if (wsUrl) {
      sendMessage(JSON.stringify({ type: 'landmarks', data: landmarks }));
      setTransmissionCount(prev => prev + 1);
    }
  }, [sendMessage, wsUrl]);

  // useMediaPipeHolistic 훅
  const {
    videoRef,
    canvasRef,
    isInitialized,
    isProcessing,
    lastLandmarks,
    startCamera,
    stopCamera,
    retryInitialization,
    error: mediaPipeError
  } = useMediaPipeHolistic({
    onLandmarks: handleLandmarksDetected,
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
    enableLogging: false
  });

  // 캠(비디오)은 항상 켜지도록 (페이지 진입 시 바로 startCamera, 언마운트 시 stopCamera)
  useEffect(() => {
    if (isInitialized) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isInitialized, startCamera, stopCamera]);

  // landmarks가 들어오면 바로 분류
  useEffect(() => {
    if (lastLandmarks && isRecording && wsUrl) {
      const landmarksData = {
        type: 'landmarks',
        data: {
          pose: lastLandmarks.pose,
          left_hand: lastLandmarks.left_hand,
          right_hand: lastLandmarks.right_hand
        }
      };
      sendMessage(JSON.stringify(landmarksData));
      setTransmissionCount(prev => prev + 1);
    }
  }, [lastLandmarks, isRecording, wsUrl, sendMessage]);

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

  // landmarks가 들어올 때마다, 정답 후 리셋 대기 중이면 prediction이 None(또는 정답이 아닌 상태)일 때만 분류 재시작
  useEffect(() => {
    if (isWaitingForReset && lastLandmarks && currentResult) {
      const prediction = currentResult?.prediction;
      if (prediction === 'None' || prediction !== lesson?.sign_text) {
        setIsWaitingForReset(false);
        setIsRecording(true);
      }
    }
  }, [isWaitingForReset, lastLandmarks, currentResult, lesson]);

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
      {/* Header */}
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
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {correctCount} / {CORRECT_TARGET} 회 성공
              </div>
              <div className="w-32">
                <Progress value={(correctCount / CORRECT_TARGET) * 100} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-[1400px] mx-auto overflow-x-auto">
          <div className="grid grid-cols-2 gap-12 items-start justify-center">
            {/* 애니메이션 영역 */}
            <div className="w-[680px] min-h-[600px] mx-auto mt-32">
                      <Button 
      onClick={togglePlaybackSpeed} 
      variant="outline" 
      size="sm"
      className="flex items-center"
    >
      {isSlowMotion ? '일반 속도' : '천천히 보기'} 
      {isSlowMotion ? '(1x)' : '(0.5x)'}
    </Button>
  {videoSrc ? (
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
  )}
            </div>
            {/* 캠 영역 */}
            <div className="mt-4 p-0 bg-gray-100 rounded-md flex flex-col items-center w-[480px] min-h-[360px] mx-auto">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">실시간 따라하기</h3>
              <p className="text-gray-600 mb-4">웹캠을 보며 수어를 따라해보세요. 3회 성공 시 학습이 완료됩니다.</p>
              {/* MediaPipe용 비디오/캔버스만 숨김 */}
              <div className="hidden relative w-full max-w-lg mx-auto">
                <video
                  ref={videoRef}
                  width={640}
                  height={480}
                  autoPlay
                  muted
                  playsInline
                  className="rounded-lg bg-black w-full h-auto object-cover"
                  style={{ aspectRatio: '4/3' }}
                />
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ aspectRatio: '4/3' }}
                />
              </div>
              <div className="flex justify-center mt-4">
                {feedback === 'correct' && (
                  <span className="text-green-600 font-bold">정답!</span>
                )}
                {feedback === 'incorrect' && (
                  <span className="text-red-600 font-bold">다시 시도해보세요</span>
                )}
              </div>
              {/* VideoInput은 그대로 노출 */}
              <div className="space-y-4">
                <VideoInput
                  width={480}
                  height={360}
                  autoStart={true}
                  showControls={true}
                  className="h-full"
                  currentSign={lesson ?? undefined}
                  currentResult={displayConfidence}
                />
              </div>
            </div>
          </div>

          {/* Feedback Display */}
          {!isCompleted && feedback && (
            <div className="mt-8">
              <FeedbackModalForLearn
                feedback={feedback}
                prediction={currentResult?.prediction ?? "none"}
                onComplete={undefined}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Learn;