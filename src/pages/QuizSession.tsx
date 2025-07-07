import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect, useRef, useCallback } from 'react';
import { signClassifierClient, ClassificationResult } from '../services/SignClassifierClient';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLearningData } from '@/hooks/useLearningData';
import { useVideoStream } from '../hooks/useVideoStream';
import { Button } from '@/components/ui/button';

import HandDetectionIndicator from '@/components/HandDetectionIndicator';
import { createPoseHandler } from '@/components/detect/usePoseHandler';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import QuizTimer from '@/components/QuizTimer';
import SessionHeader from '@/components/SessionHeader';
import QuizDisplay from '@/components/QuizDisplay';
import WebcamSection from '@/components/WebcamSection';
import NotFound from './NotFound';
import API from '@/components/AxiosInstance';
import { Chapter } from '@/types/learning';

// 주요 변경 점 | 7월 6일 자정 작업
// 변수 및 의존성 재확인 : 전부 다 아님
// anim 관련 메서드 전체 제거


// 7월 6일 오후 2시 반영
// function foo() {}; 는 foo를 호출 할 useEffect 위에 있던 아래 있던 상관 없이 호출 가능하다. (Function Declaration)
// 하지만,
// const foo = () => {}; 형식은 반드시 foo를 호출하는 useEffect 보다 우선 되어야 사용 가능하다. (Function Expression)
// 이 부분에 대한 배치에 대한 헷갈림을 방지하기 위해 아래와 같이 전체적 형식을 구성하고자 한다

// import 문
// definition default Function Expression : 여기서는 const QuizSession = () => {
  // [get, set 형식의 변수 선언]
  // [이 페이지 (Quiz.tsx)에서 사용 할 Function Expression 선언]
  // useEffect 나열
  // 조건에 따른 return (페이지에 표시 할 것 결정)
// const QuizSession 정의 내용 종료 }
// export default QuizSession;

// isQuizMode 제거

// 퀴즈 정의 : QUIZ_TIME_LIMIT초 안에 주어지는 제스처대로 못하면 실패
  // 다음 Lesson(단어)로 넘어가고 다시 QUIZ_TIME_LIMIT 시간을 센다.
    // Lesson 리스트가 끝날 때 까지 반복
  

const QuizSession () => {
  const [isCrossed, setIsCrossed] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [isMovingNextSign, setIsMovingNextSign] = useState(false);

  const [currentResult, setCurrentResult] = useState<ClassificationResult | null>(null); 
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const navigate = useNavigate();
  const { categoryId, chapterId, sessionType } = useParams();
  const {videoRef, canvasRef, state, startStream, stopStream, captureFrameAsync } = useVideoStream();
  const { getCategoryById, findChapterById, addToReview, markSignCompleted, markChapterCompleted, markCategoryCompleted, getChapterProgress } = useLearningData();

  const [currentSignIndex, setCurrentSignIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const [quizResults, setQuizResults] = useState<{ signId: string, correct: boolean, timeSpent: number }[]>([]);
  const QUIZ_TIME_LIMIT = 15; // 15초 제한
  const category = categoryId ? getCategoryById(categoryId) : null;
  const [chapter, setChapter] = useState<Chapter | undefined | null>(null);
  //const [chapter, setChapter] = useState<any>(null);
  const currentSign = chapter?.signs[currentSignIndex];

  const transmissionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const detectTimer = useRef<NodeJS.Timeout | null>(null);
  const initialPose = useRef<boolean>(false);


  // 이 함수로, 사용자가 퀴즈 컨텐츠 (다? 레슨 단위?) 하고 백엔드에 결과 기록 요청한다.
  const sendQuizResult = async () =>{
    try {
      if (!quizResults.length) return;
      const simplifiedResults = quizResults.map(({ signId, correct }) => ({
        signId,
        correct,
      }));
      await API.post(`/quiz/chapter/${chapterId}/submit`, simplifiedResults);
    } catch (error) {
      console.error("퀴즈 결과 전송 실패:", error);
    }
  }

  // 이 함수로, 분류 서버에 연결을 시도 한다.
  const attemptConnection = async (attemptNumber: number = 1): Promise<boolean> => {
    console.log(`🔌 서버 연결 시도 ${attemptNumber}...`);
    setIsConnecting(true);

    try {
      const success = await signClassifierClient.connect();
      setIsConnected(success);

      if (success) {
        console.log('✅ 서버 연결 성공');
        return true;
      } else {
        console.log(`❌ 서버 연결 실패 (시도 ${attemptNumber})`);
        return false;
      }
    } catch (error) {
      console.error('서버 연결 중 오류:', error);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // 이 함수로, 페이지 진입 시 처음 준비 해야 할 내용들 준비 된다..
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
          }
        }, 500);
      } else {
        console.error('❌ 최대 연결 시도 횟수 초과');
      }
    } catch (error) {
      console.error('세션 초기화 실패:', error);
    }
  };

  // 이 함수로, 분류 서버와 교신 시작한다.
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
      return;
    }

    if (!state.isStreaming || !state.stream) {
      console.log('비디오 스트림이 준비되지 않음');
      return;
    }

    if (!videoRef.current || videoRef.current.readyState < 2) {
      console.log('비디오 엘리먼트가 준비되지 않음');
      return;
    }

    setIsTransmitting(true);

    console.log('✅ 전송 시작!');
    transmissionIntervalRef.current = setInterval(async () => {
      try {
        const frame = await captureFrameAsync();
        if (frame) {
          const success = signClassifierClient.sendVideoChunk(frame);
          if (!success) {
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

  // 이 함수로, 실질적인 컨텐츠 타이머 시작
  const handleStartRecording = () => {
  setIsRecording(true);
  setFeedback(null);
  setCurrentResult(null); // 이전 분류 결과 초기화
  setTimerActive(true);
  console.log('🎬 수어 녹화 시작:', currentSign?.word);
  };

  // 시간 초과 시 호출
  const handleTimeUp = () => {
    setIsRecording(false);
    setTimerActive(false);
    setFeedback('incorrect');

    if (currentSign) {
      setQuizResults(prev => [...prev, {
        signId: currentSign.id,
        correct: false,
        timeSpent: QUIZ_TIME_LIMIT
      }]);
      addToReview(currentSign);
    }

    // 퀴즈 모드에서는 시간 초과 시에도 자동으로 다음 문제로 이동
    setTimeout(() => {
      handleNextSign();
    }, 3000); // 3초로 통일
  };

  // 다음 수어(레슨)으로 넘어가는 내용
  const handleNextSign = async () => {
    setIsMovingNextSign(false);
    if (chapter && currentSignIndex < chapter.signs.length - 1) {
      setCurrentSignIndex(currentSignIndex + 1);
      setFeedback(null);
      setTimerActive(false);
      setQuizStarted(false);
    } else {
      // 챕터 완료 처리
      if (chapter) {
        const chapterProgress = getChapterProgress(chapter);
        if (chapterProgress.percentage === 100) {
          markChapterCompleted(chapter.id);
        }

        // 카테고리 완료 확인
        if (category) {
          const allChaptersCompleted = category.chapters.every(ch => {
            const progress = getChapterProgress(ch);
            return progress.percentage === 100;
          });
          if (allChaptersCompleted) {
            markCategoryCompleted(category.id);
          }
        }
      }
      setSessionComplete(true);
    }
  };

  // FeedbackDisplay 완료 콜백 함수
  const handleFeedbackComplete = () => {
    console.log('🎉 FeedbackDisplay 완료, 다음 수어로 이동');
    handleNextSign();
  };

    const handleRetry = () => {
      setFeedback(null);
      setIsRecording(false);
      setTimerActive(false);
      setQuizStarted(false);
      setCurrentResult(null); // 이전 분류 결과 초기화
      console.log('🔄 다시 시도:', currentSign?.word);
  };


  // 챕터 아이디를 통해 챕터 첫 준비
  // categoryID, chapterID
  useEffect(() => {
    if (chapterId) {
      const loadChapter = async () => {
        try {
          const chapterData = await findChapterById(chapterId);
          setChapter(chapterData);
        } catch (error) {
          console.error('챕터 데이터 로드 실패:', error);
        }
      };
      loadChapter();
    }
  }, [categoryId, chapterId]);

    useEffect(() => {
    API.get<{ success: boolean; data: { type: string }; message: string }>(`/quiz/chapter/${chapterId}`)
      .then(res => {
        const type = res.data.data.type;
        if (type == '자음') {
          navigate("/test/letter/consonant/study");
        } else if (type == '모음') {
          navigate("/test/letter/vowel/study");
        }
        else {
          localStorage.removeItem("studyword");
          setCurrentSignIndex(0);
          setQuizResults([]);
          setFeedback(null);
        }
      })
      .catch(err => {
        console.error('타입 조회 실패:', err);
        navigate("/not-found");
      });
  }, [chapterId, categoryId, sessionType, navigate]);
  
  // [단 한 번만 실행] 자동 연결 및 스트림 시작
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

  //======= 비디오 스트림 및 MediaPipe 포즈 감지 =======
  useEffect(() => {
    if (!state.isStreaming || !videoRef.current) return;

    console.log('🎯 MediaPipe pose detection 시작');
    // 이게 제일 어려움.
    const pose = createPoseHandler((rightShoulder, rightWrist, isHandDetected) => {
      if (detectTimer.current) {
        return;
      }
      const shoulderVisibility = rightShoulder as typeof rightShoulder & { visibility: number };
      const wristVisibility = rightWrist as typeof rightWrist & { visibility: number };
      if ((shoulderVisibility.visibility ?? 0) < 0.5 || (wristVisibility.visibility ?? 0) < 0.5) {
        setIsHandDetected(false);
        initialPose.current = false;
        setIsCrossed(false);
        return;
      }
      // 손 감지 상태 업데이트      
      if (isHandDetected && rightWrist && rightShoulder) {
        if (rightWrist.x < rightShoulder.x) {
          initialPose.current = true;
          console.log('🤚 초기 포즈 감지됨 (손이 어깨 왼쪽)');
        }
        if (initialPose.current && rightWrist.x > rightShoulder.x) {
          if (!detectTimer.current) {
            setIsCrossed(true);
            console.log('✋ 손이 어깨를 가로질렀습니다');
            detectTimer.current = setTimeout(() => {
              detectTimer.current = null;
            }, 5000);
          }
        }
      }
    });

    // TODO: MediaPipe 설정을 외부로 분리 
    // 비디오가 준비되면 MediaPipe에 연결
    const video = videoRef.current;
    if (video.readyState >= 2) {
      console.log('📹 비디오 준비됨, MediaPipe 연결 시작');

      const processFrame = async () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          await pose.send({ image: video });
        }
        if (state.isStreaming) {
          requestAnimationFrame(processFrame);
        }
      };

      processFrame();
    } else {
      // 비디오가 준비될 때까지 대기
      const onVideoReady = async () => {
        console.log('📹 비디오 준비됨, MediaPipe 연결 시작');

        const processFrame = async () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            await pose.send({ image: video });
          }
          if (state.isStreaming) {
            requestAnimationFrame(processFrame);
          }
        };

        processFrame();
      };

      video.addEventListener('loadeddata', onVideoReady);
      return () => {
        video.removeEventListener('loadeddata', onVideoReady);
      };
    }
  }, [state.isStreaming, videoRef.current]);

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

  // 연결 상태 변경 시 자동 재연결
  useEffect(() => {
    if (isConnected === false) {
      console.log('🔄 연결이 끊어짐, 자동 재연결 시도...');
      const reconnect = async () => {
        try {
          setIsConnecting(true);
          const success = await attemptConnection(1);
          setIsConnected(success);
          setIsConnecting(false);

          if (success) {
            console.log('✅ 자동 재연결 성공');
            // 재연결 성공 시 비디오 스트림도 재시작
            if (!state.isStreaming) {
              await startStream();
            }
          } else {
            console.log('❌ 자동 재연결 실패');
          }
        } catch (error) {
          console.error('자동 재연결 실패:', error);
          setIsConnecting(false);
        }
      };

      // 5초 후 재연결 시도
      const timeoutId = setTimeout(reconnect, 5000);
      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, isConnecting, state.isStreaming]);

  useEffect(() => {
    if (chapter) {
      setProgress((currentSignIndex / chapter.signs.length) * 100);
    }
  }, [currentSignIndex, chapter]);
  // 연결 상태 주기적 확인
  useEffect(() => {
    const checkConnectionStatus = () => {
      const currentStatus = signClassifierClient.getConnectionStatus();
      if (currentStatus !== isConnected) {
        console.log(`🔗 연결 상태 변경: ${isConnected} → ${currentStatus}`);
        setIsConnected(currentStatus);

        // 연결이 끊어진 경우 전송 중지
        if (!currentStatus && isTransmitting) {
          console.log('🔴 연결 끊어짐, 전송 중지');
          setIsTransmitting(false);
          if (transmissionIntervalRef.current) {
            clearInterval(transmissionIntervalRef.current);
            transmissionIntervalRef.current = null;
          }
        }
      }
    };

    const interval = setInterval(checkConnectionStatus, 2000); // 2초마다 확인
    return () => clearInterval(interval);
  }, [isConnected, isTransmitting]);

  // 분류 결과와 정답 비교 로직 (4-8, 4-9 구현)
  useEffect(() => {
    if (!currentResult || !currentSign || isMovingNextSign) {
      return;
    }

          // 분류 1위와 정답 수어 비교
    const isCorrect = (currentResult.prediction.toLowerCase() === currentSign.word.toLowerCase()) && isCrossed;
    const confidence = currentResult.confidence;

    console.log('🎯 분류 결과 비교:', {
      prediction: currentResult.prediction,
      answer: currentSign.word,
      isCorrect,
      confidence: (confidence * 100).toFixed(1) + '%'
    });
    console.log('currentResult', currentResult);
    console.log('currentSign', currentSign);

    // 오탐지 방지를 위해 신뢰도가 일정 수준 이상일 때만 결과 처리하도록 한다.
    if (confidence >= 0.5) {
      setFeedback(isCorrect ? 'correct' : 'incorrect');
      setIsRecording(false);
      setTimerActive(false);

      // 학습 진도 업데이트, 퀴즈에 해당 사항 없나?
      if (isCorrect && currentSign) {
        markSignCompleted(currentSign.id);
        const currentId = currentSign.id;
        const prevCompleted = JSON.parse(localStorage.getItem('studyword') || '[]');
        const filtered = prevCompleted.filter((id: string) => id !== currentId);
        filtered.push(currentId);
        localStorage.setItem('studyword', JSON.stringify(filtered));
      }

      if (currentSign) {
        const timeSpent = QUIZ_TIME_LIMIT - (timerActive ? QUIZ_TIME_LIMIT : 0);
        setQuizResults(prev => [...prev, {
          signId: currentSign.id,
          correct: isCorrect,
          timeSpent
        }]);

        if (!isCorrect) {
          addToReview(currentSign);
        }
      }

      // 정답이면 피드백 표시 (자동 진행은 FeedbackDisplay의 onComplete에서 처리)
      if (isCorrect) {
        setIsMovingNextSign(true);
        // 자동 진행 로직 제거 - FeedbackDisplay의 onComplete에서 처리
      } else {
        // 퀴즈 모드에서 오답일 때는 3초 후 자동 진행
        setTimeout(() => {
          handleNextSign();
        }, 3000);
      }
    }
  }, [currentResult, currentSign, feedback, timerActive]);

  // 퀴즈 모드에서 새로운 문제가 시작될 때 자동으로 타이머 시작
  useEffect(() => {
    if (currentSign && !feedback) {
      setQuizStarted(true);
      setTimerActive(true);
      setIsRecording(true);

      // 15초 후 자동으로 시간 초과 처리
      const timer = setTimeout(() => {
        if (isRecording && timerActive) {
          handleTimeUp();
        }
      }, QUIZ_TIME_LIMIT * 1000);

      return () => clearTimeout(timer);
    }
  }, [currentSignIndex, currentSign, feedback]);

  // 세션 완료 시 활동 기록
  useEffect(() => {
    if (sessionComplete) {
      const recordActivity = async () => {
        try {
          await API.post('/user/daily-activity/complete', recordActivity);
          console.log("오늘 활동 기록 완료!(퀴즈/세션)");
        } catch (err) {
          console.error("오늘 활동 기록 실패(퀴즈/세션):", err);
        }
    }
  }}, [sessionComplete]);


  // 렌더링 시점에 실행
  // 이거 원문에도 내용이 없는데 뭐야?
  if (connectionError) {
    return (
      <div>Connection Error. gogo home baby</div>
      // <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      //   <Card className="max-w-md w-full mx-4">
      //     <CardHeader className="text-center">
      //       <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
      //       <CardTitle>연결 오류</CardTitle>
      //     </CardHeader>
      //     <CardContent className="text-center space-y-4">
      //       <p className="text-gray-600">{connectionErroMessage}</p>
      //       <Button
      //         onClick={() => window.location.reload()}
      //         className="bg-blue-600 hover:bg-blue-700"
      //       >
      //         <RefreshCw className="h-4 w-4 mr-2" />
      //         페이지 새로고침
      //       </Button>
      //       <Button
      //         variant="outline"
      //         onClick={() => navigate('/home')}
      //       >
      //         홈으로 돌아가기
      //       </Button>
      //     </CardContent>
      //   </Card>
      // </div>
    );
  }


  if (!chapter || !currentSign) {
    return (
     <NotFound/>);
  }

  // 여기는 완료 했을 때 표시된다 
  if (sessionComplete) {
    const correctAnswers = quizResults.filter(r => r.correct).length;
    const totalQuestions = quizResults.length;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <CardTitle>
              {'퀴즈 완료!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {(
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
              '{chapter.title}' 퀴즈를 완료했습니다!
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await sendQuizResult();
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
                  await sendQuizResult();
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

  // 
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 손 감지 상태 표시 인디케이터 */}
      <HandDetectionIndicator
        isHandDetected={isHandDetected}
        isConnected={isConnected}
        isStreaming={state.isStreaming}
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
            <div className="mb-6">
              <QuizTimer
                duration={QUIZ_TIME_LIMIT}
                onTimeUp={handleTimeUp}
                isActive={timerActive}
              />
            </div>
          
          {/* 퀴즈이기 때문에 시범을 안보여준다! */}
          <div className="grid lg:grid-cols-2 gap-12">
              <QuizDisplay
                currentSign={currentSign}
                quizStarted={quizStarted}
                feedback={feedback}
                handleNextSign={handleNextSign}
              />

            {/* 웹캠 및 분류 결과 */}
            <WebcamSection
              isQuizMode={true}
              isConnected={isConnected}
              isConnecting={isConnecting}
              isTransmitting={isTransmitting}
              state={state}
              videoRef={videoRef}
              canvasRef={canvasRef}
              currentResult={currentResult}
              connectionError={"just error"}
              isRecording={isRecording}
              feedback={feedback}
              handleStartRecording={handleStartRecording}
              handleNextSign={handleNextSign}
              handleRetry={handleRetry}
            />
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
      </main>
    </div>
  );
};

export default QuizSession;