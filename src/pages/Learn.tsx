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
import useWebsocket, { connectToWebSockets } from '@/hooks/useWebsocket';
import { useMediaPipeHolistic } from '@/hooks/useMediaPipeHolistic';
import FeedbackModalForLearn from '@/components/FeedbackModalForLearn';

interface Lesson extends LessonBase {
  sign_text?: string;
  media_url?: string;
  chapter_id?: string;
}

const CORRECT_TARGET = 3;

const Learn = () => {
  const [animData, setAnimData] = useState(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isRecording, setIsRecording] = useState(true); // 진입 시 바로 분류 시작
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [displayConfidence, setDisplayConfidence] = useState<string>('');
  const [transmissionCount, setTransmissionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

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
        setLesson(res.data.data);
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
        const response = await API.get(`/anim/${lessonId}`);
        const data: any = response.data;
        setAnimData(data.data || data);
      } catch (error) {
        console.error('애니메이션 불러오는데 실패했습니다 : ', error);
      }
    };
    if (lessonId) loadAnim();
  }, [lessonId]);

  // 애니메이션 자동 재생
  useEffect(() => {
    let interval = null;
    if (animData && animData.pose && animData.pose.length > 0) {
      interval = setInterval(() => {
        setCurrentFrame(prev =>
          prev < animData.pose.length - 1 ? prev + 1 : 0
        );
      }, 1000 / 30);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [animData]);

  // MediaPipe + WebSocket 연동
  const handleLandmarksDetected = useCallback((landmarks: any) => {
    if (isRecording && wsUrl) {
      sendMessage(JSON.stringify({ type: 'landmarks', data: landmarks }));
      setTransmissionCount(prev => prev + 1);
    }
  }, [isRecording, sendMessage, wsUrl]);

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
  }, [isInitialized]);

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
              // 정답 시 분류 멈춤(모달 띄우기)
              if (percent != null && percent >= 80.0 && feedback !== 'correct') {
                setFeedback('correct');
                setIsRecording(false); // 분류 멈춤, 캠은 계속
              } else if (percent != null && percent < 80.0 && feedback !== 'incorrect') {
                setFeedback('incorrect');
              }
            }
          } catch (e) {}
        };
        ws.addEventListener('message', fn);
        return { ws, fn };
      });
      return () => {
        handlers.forEach(({ ws, fn }) => ws.removeEventListener('message', fn));
      };
    }
  }, [wsList, wsUrl, lesson, feedback]);

  // 정답 피드백이 닫힐 때 처리 (모든 상태 전이 담당)
  const handleFeedbackComplete = useCallback(() => {
    setCorrectCount(prev => {
      const next = prev + 1;
      if (next >= CORRECT_TARGET) {
        setIsCompleted(true);
        // setIsRecording(false); // 캠 멈추지 않음
      } else {
        setIsRecording(true); // 3회 미만이면 분류 재시작
      }
      return next;
    });
    setFeedback(null);
    setCurrentResult(null);
  }, []);

  // 정답 모달이 뜨면 3초 뒤 자동으로 닫힘
  useEffect(() => {
    if (feedback === 'correct') {
      const timer = setTimeout(() => {
        handleFeedbackComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback, handleFeedbackComplete]);

  // 캠/분류/모달 등은 isCompleted가 true면 모두 중단
  useEffect(() => {
    if (isCompleted) {
      setIsRecording(false);
      setFeedback(null);
      setCurrentResult(null);
    }
  }, [isCompleted]);

  // isRecording 상태에 따라 캠을 제어 (startCamera/stopCamera)
  useEffect(() => {
    if (isRecording && isInitialized) {
      startCamera();
    } else if (!isRecording) {
      stopCamera();
    }
  }, [isRecording, isInitialized, startCamera, stopCamera]);

  // 다시하기 핸들러
  const handleRetry = () => {
    setCorrectCount(0);
    setIsCompleted(false);
    setFeedback(null);
    setCurrentResult(null);
    setIsRecording(true);
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
              <Button onClick={() => navigate('/home')} className="bg-blue-600 hover:bg-blue-700">
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
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* 애니메이션 영역 */}
            <div className="flex flex-col items-center justify-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">수어 예시</h3>
              {/* animData 상태 임시 출력 */}
              <div className="text-xs text-gray-500 mb-2">
                animData: {animData ? 'O' : 'X'} | pose: {animData?.pose ? animData.pose.length : 0}
              </div>
              {animData && animData.pose && animData.pose.length > 0 ? (
                <div style={{ minHeight: 360, minWidth: 320, width: '100%' }}>
                  <ExampleAnim data={animData} currentFrame={currentFrame} showCylinders={true} showLeftHand={true} showRightHand={true}/>
                </div>
              ) : (
                <div className="text-gray-400 mt-8">애니메이션 데이터를 불러오는 중이거나 데이터가 없습니다.</div>
              )}
            </div>
            {/* 캠 영역 */}
            <div className="mt-4 p-6 bg-gray-100 rounded-md flex flex-col items-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">실시간 따라하기</h3>
              <p className="text-gray-600 mb-4">웹캠을 보며 수어를 따라해보세요. 3회 성공 시 학습이 완료됩니다.</p>
              <div className="relative w-full max-w-lg mx-auto">
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
            </div>
          </div>

          {/* Feedback Display */}
          {!isCompleted && feedback && (
            <div className="mt-8">
              <FeedbackModalForLearn
                feedback={feedback}
                prediction={currentResult?.prediction ?? "none"}
                onComplete={feedback === 'correct' ? undefined : handleFeedbackComplete}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Learn;
