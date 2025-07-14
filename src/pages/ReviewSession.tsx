import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  CheckCircle,
  BookOpen,
  LucidePersonStanding
} from 'lucide-react';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import API from "@/components/AxiosInstance";
import { useLearningData } from '@/hooks/useLearningData';
import { Lesson as LessonBase } from '@/types/learning';
import VideoInput from '@/components/VideoInput';
import useWebsocket, { connectToWebSockets } from '@/hooks/useWebsocket';
import { useMediaPipeHolistic } from '@/hooks/useMediaPipeHolistic';
import FeedbackModalForLearn from '@/components/FeedbackModalForLearn';
import QuizTimer from '@/components/QuizTimer';
import { useBadgeSystem } from '@/hooks/useBadgeSystem';

interface Lesson extends LessonBase {
  sign_text?: string;
  media_url?: string;
  chapter_id?: string;
}

const CORRECT_CNT_SINGLE_LESSON = 2;
const QUIZ_TIME_LIMIT = 15;
// 7월 11일, 기존 검색-수어 Based Review System 구축

// caution : 백엔드 api에 오타 수정 해야 이거 작동함. pr 잊지말고 해야 작동 보장함
const ReviewSession = () => {
  const { checkBadges } = useBadgeSystem();
    const [videoSrc, setVideoSrc] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(true); // 진입 시 바로 분류 시작
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [displayConfidence, setDisplayConfidence] = useState<string>('');
  const [transmissionCount, setTransmissionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isWaitingForReset, setIsWaitingForReset] = useState(false);
  const [isSlowMotion, setIsSlowMotion] = useState(false);
  const navigate = useNavigate();
  
  const { chapterId } = useParams();
  const [lessonId, setLessonId] = useState(null);
  // lessonId를 chapterId에 맞는 내용으로 가져와야함
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonIdx, setLessonIdx] = useState(0);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [wsUrlLoading, setWsUrlLoading] = useState(false);

  const [timerActive, setTimerActive] = useState(false);
  const [quizResults, setQuizResults] = useState<{ signId: string, correct: boolean, timeSpent: number }[]>([]);
  const [isQuizReady, setIsQuizReady] = useState(false); // 퀴즈 준비 상태 추가
  const [timeSpent, setTimeSpent] = useState(0); // 실제 사용한 시간 추적

    // 복습하기 대상 챕터의 진행 상태를 불러온다.
    // TODO : 백엔드에서 review를 해야하는 단어로 필터링을 변경해야 함. 현재는 특별히 필터링이 없는 것으로 추정
    // TODO? : 복습하기 진입 전 복습해야 할 대상 단어들 목록을 조회 할텐데, 그 조회 결과를 그대로 쓸 수 있을지에 대한 고민
    useEffect(() => {
    setLessonLoading(true);
    API.get<{ success: boolean; data: Lesson[] }>(`/progress/failures/${chapterId}`)
      .then(res => {
        const wrongLessons = res.data.data;
        console.log(res);
        setLessons(wrongLessons);
        if (wrongLessons.length > 0) {
          setLessonId(wrongLessons[0].id);
          setLesson(wrongLessons[0]);
        }
        setLessonLoading(false);
      })
      .catch(() => {
        setLessonError('레슨을 불러오는데 실패했습니다.');
        setLessonLoading(false);
      });
  }, [chapterId]);

  // 의도적으로 레슨 하나가 바뀔 때마다 해당하는 모델 준비하는 코드.
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

  // wsUrl이 준비된 후에만 웹소켓 연결 [완료]
  useEffect(() => {
    if (wsUrl) {
      connectToWebSockets([wsUrl]);
    }
  }, [wsUrl]);
  const { connectionStatus, wsList, sendMessage } = useWebsocket();

  // 애니메이션 데이터 로딩 [완료]
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

  useEffect(() => {
  const videoElement = document.querySelector('video[src]') as HTMLVideoElement;
  if (videoElement) {
    videoElement.playbackRate = isSlowMotion ? 0.5 : 1.0;
  }
}, [isSlowMotion, videoSrc]);

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

  const DEBUG_MAKECORRECT = () => { // 디버깅용
    setFeedback('correct');
  };

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

  // 최근 학습 반영: 세션 진입 시점에 호출
  useEffect(() => {
    if (lessons && lessons.length > 0) {
      const lessonIds = lessons.map(l => l.id);
      API.post('/progress/lessons/events', { lesson_ids: lessonIds });
    }
  }, [lessons]);

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

  // WebSocket 통해서 분류 결과 처리: 정답이면 카운트 증가
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

  useEffect(() => {
  if (videoRef.current && videoSrc) {
    videoRef.current.playbackRate = isSlowMotion ? 0.5 : 1.0;
  }
}, [videoSrc, isSlowMotion]);


  // 정답/오답 피드백이 닫힐 때 처리 (모든 상태 전이 담당) [Review 전용 로직 반영 완료]
  // TODO : 구조는 동일하되 내용 개선 필요
  const handleFeedbackComplete = useCallback(() => {
    setCorrectCount(prev => {
      let next = prev;
      if (feedback === 'correct') next = prev + 1;

      if(next === 2)
      {
        setIsQuizMode(false);
        setLessonIdx(prev_value => prev_value + 1);
      }
      if(next === 1)
      {
        setIsQuizMode(true);
        handleStartQuiz();
      }
      else
      {
        setIsQuizMode(false);
      }
      return next;
    });
    setFeedback(null);
    setCurrentResult(null);
    if (feedback === 'correct') {
      setIsWaitingForReset(true); // 정답 후에는 리셋 대기
    }
  }, [feedback]);

  const handleNextSign = useCallback(async () => {
    console.log('🔄 다음 수어로 이동:', lessonIdx + 1);
    //setIsMovingNextSign(false);
    
    // 타이머 상태 초기화
    setTimerActive(false);
    
    setIsRecording(false);
    setIsQuizReady(false);
    
    if (lessons && lessonIdx < lessons.length - 1) {
      setLessonIdx(lessonIdx + 1);
      setFeedback(null);
    } else {
      setIsCompleted(true);
    }
  }, [lessonIdx, lessons]);

  const handleRepeatSign = useCallback(() => {
    console.log("반복");
    setIsQuizMode(false);
    setCorrectCount(0);
    setCurrentResult(null);
    setIsRecording(true);

  }, []);

  // 시간 초과 시 호출
  const handleTimeUp = useCallback(() => {
    console.log('⏰ 시간 초과! 오답 처리');
    setIsRecording(false);
    setTimerActive(false);
    setFeedback('incorrect');

    // 오답이면 다시해 이녀석아
    if (lesson) {
      setQuizResults(prev => [...prev, {
        signId: lesson.id,
        correct: false,
        timeSpent: QUIZ_TIME_LIMIT
      }]);
    }

    
    setTimeout(() => {
      handleRepeatSign();
    }, 3000);
  }, [lesson, handleRepeatSign]);

  // 퀴즈 시작 함수
  const handleStartQuiz = () => {
    if (lesson) {
      console.log('🎯 퀴즈 시작:', lesson.word);
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


  // 정답/오답 모달이 뜨면 3초(정답) 또는 2초(오답) 뒤 자동으로 닫힘
  useEffect(() => {
    if (feedback === 'correct' || feedback === 'incorrect') {
      const timer = setTimeout(() => {
        handleFeedbackComplete();
      }, feedback === 'correct' ? 3000 : 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback, handleFeedbackComplete]);

// 별도의 useEffect에서 lessonIdx 변경 감지 및 처리
useEffect(() => {
  if(lessonIdx === 0) return;
  if (lessons.length > 0 && lessonIdx < lessons.length) {
    setLessonId(lessons[lessonIdx].id);
    setLesson(lessons[lessonIdx]);
  }
}, [lessonIdx, lessons]);

  // 수행 중 카운트 변동 시 자동 실행 
  // TODO : 결과가 DB에 반영되도록 하는 내용 추가 필요
  useEffect(() => {
    if (correctCount >= CORRECT_CNT_SINGLE_LESSON) {
      if(lessonIdx > lessons.length - 1)
      {
        // 다룰 단어가 더 이상 없다면 내용 종료
        setIsCompleted(true);
        setIsRecording(false);
        setFeedback(null);
        setCurrentResult(null);
        setIsWaitingForReset(false);
        console.log("레슨들에 대한 내용을 모두 마쳤다.");
      }
      else
      {
        setCorrectCount(0);
      // setIsRecording(true);
       setCurrentResult(null);
       setFeedback(null);
       
       setIsQuizMode(false);
      console.log("다음 레슨으로 넘어가겠다!!");
      }

      console.log("완료!");
            const recordActivity = async () => {
        try {
          await API.post(`/review/mark/${lesson.id}`);
          console.log("해당 리뷰에 대한 기록을 완료했다.");
        } catch (err) {
          console.error("기록을 못했어요..", err);
        };
    }
    recordActivity();
    
      
    } else if (!isCompleted && feedback === null && !isWaitingForReset) {
      // 3회 미만이고 모달이 닫혔으며, 리셋 대기가 아닐 때만 분류 재시작
      console.log("불리면 안되는데");
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

  // 데이터 로딩/에러 처리
  if (lessonLoading || wsUrlLoading) {
    return <div className="text-center mt-10">수어 정보를 불러오는 중입니다...</div>;
  }
  if (lessonError) {
    return <div className="text-center mt-10 text-red-500">{lessonError}</div>;
  }
  if (lessons.length === 0) {
    return (

      <div className="text-center mt-10 text-gray-600">복습할 틀린 문제가 없습니다!
      <Button onClick={() => navigate('/home')}>돌아가기</Button>
      </div>

      
    );
  }

  // 완료 화면
  if (isCompleted) {
    checkBadges("");
    navigate(`/complete/chapter/${chapterId}/${3}`);
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
                {correctCount} / {CORRECT_CNT_SINGLE_LESSON} 회 성공
              </div>
              <div className="w-32">
                <Progress value={(correctCount / CORRECT_CNT_SINGLE_LESSON) * 100} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* 애니메이션 영역 */}
            {!isQuizMode  && <div className="flex flex-col items-center justify-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">수어 예시</h3>

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
            }
              {isQuizMode  && (
            <div className="mb-6">
              <QuizTimer
                duration={QUIZ_TIME_LIMIT}
                onTimeUp={handleTimeUp}
                isActive={timerActive}
                onTimeChange={setTimeSpent}
              />
            </div>
          )

              

            }
            
            {/* 캠 영역 */}
            <div className="mt-4 p-6 bg-gray-100 rounded-md flex flex-col items-center">
              <Button onClick={DEBUG_MAKECORRECT}>일단 정답 처리</Button>
                                <Button 
      onClick={togglePlaybackSpeed} 
      variant="outline" 
      size="sm"
      className="flex items-center"
    >
      {isSlowMotion ? '일반 속도' : '천천히 보기'} 
      {isSlowMotion ? '(1x)' : '(0.5x)'}
    </Button>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">따라하기</h3>
              <p className="text-gray-600 mb-4">웹캠을 보며 수어를 따라해보세요.</p>
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
                onComplete={undefined}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReviewSession;
