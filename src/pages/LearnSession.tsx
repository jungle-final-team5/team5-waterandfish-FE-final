import React, {useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import VideoInput from '@/components/VideoInput';
import StreamingControls from '@/components/StreamingControls';
import SessionInfo from '@/components/SessionInfo';
import PageHeader from '@/components/PageHeader';
import { useVideoStreaming } from '@/hooks/useVideoStreaming';
import useWebsocket from '@/hooks/useWebsocket';
import { useGlobalWebSocketStatus } from '@/contexts/GlobalWebSocketContext';
import SessionHeader from '@/components/SessionHeader';
import WebcamSection from '@/components/WebcamSection';
import LearningDisplay from '@/components/LearningDisplay';
import API from '@/components/AxiosInstance';
import { useLearningData } from '@/hooks/useLearningData';
import { useVideoStream } from '@/hooks/useVideoStream';
import { Button } from '@/components/ui/button';
import { Chapter, Lesson } from '@/types/learning';



const LearnSession = () => {
  const { categoryId, chapterId, sessionType } = useParams();
  const navigate = useNavigate();
  
  // WebSocket 훅
  const { connectionStatus, wsList, broadcastMessage } = useWebsocket();
  const { showStatus } = useGlobalWebSocketStatus();

    const [isConnected, setIsConnected] = useState<boolean>(false); // 초기값에 의해 타입 결정됨.
    const [isTransmitting, setIsTransmitting] = useState(false);
    const [currentResult, setCurrentResult] = useState<ClassificationResult | null>(null); // 이 경우는 포인터 변수
    const [isConnecting, setIsConnecting] = useState(false);
    const [isCrossed, setIsCrossed] = useState(false);
    const initialPose = useRef<boolean>(false);
    const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isHandDetected, setIsHandDetected] = useState(false);
    const { state, startStream, stopStream, captureFrameAsync } = useVideoStream();
    //const {canvasRef, state, startStream, stopStream, captureFrameAsync } = useVideoStream();
  
    //const {findCategoryById, findChapterById, addToReview, markSignCompleted, markChapterCompleted, markCategoryCompleted, getChapterProgress } = useLearningData();
    const {findCategoryById, findChapterById, findLessonsByChapterId} = useLearningData();
  
    const [animData, setAnimData] = useState(null);
    const [currentFrame, setCurrentFrame] = useState(0);
  
    const [currentSignIndex, setCurrentSignIndex] = useState(0);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const currentSign = lessons[currentSignIndex];
    const [isRecording, setIsRecording] = useState(false);
    
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [sessionComplete, setSessionComplete] = useState(false);

    const category = categoryId ? findCategoryById(categoryId) : null;

    const [isMovingNextSign, setIsMovingNextSign] = useState(false);
  
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


  // 이 함수로, 분류 서버에 연결을 시도.
  // TODO : 웹 소켓과 매핑된 연결 형태로 개선 할 것
  const attemptConnection = async (attemptNumber: number = 1): Promise<boolean> => {
    console.log(`🔌 서버 연결 시도 ${attemptNumber}...`);
    setIsConnecting(true);

    try {
      const success = true;
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

  // TODO : 나사 빠짐 해결 할 것
  // const initializeSession = async (): Promise<void> => {
  //   try {
  //     // 분류 결과 콜백 설정
  //     signClassifierClient.onResult((result) => {
  //       if (isMovingNextSign == false) {
  //         setCurrentResult(result);
  //         console.log('분류 결과:', result);
  //       }
  //     });

  //     // 연결 재시도 로직
  //     const maxAttempts = 5;
  //     let connected = false;

  //     for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  //       connected = await attemptConnection(attempt);

  //       if (connected) {
  //         break;
  //       }

  //       if (attempt < maxAttempts) {
  //         console.log(`🔄 ${attempt}/${maxAttempts} 재시도 중... (3초 후)`);
  //         await new Promise(resolve => setTimeout(resolve, 3000));
  //       }
  //     }

  //     if (connected) {
  //       // 비디오 스트림 시작
  //       setTimeout(async () => {
  //         try {
  //           await startStream();
  //           console.log('🎥 비디오 스트림 시작 요청 완료');
  //         } catch (error) {
  //           console.error('비디오 스트림 시작 실패:', error);
  //         }
  //       }, 500);
  //     } else {
  //       console.error('❌ 최대 연결 시도 횟수 초과');
  //     }
  //   } catch (error) {
  //     console.error('세션 초기화 실패:', error);
  //   }
  // };

  // TODO : 나사 빠짐 해결 할 것
  // const handleStartTransmission = () => {
  //   console.log('🚀 전송 시작 시도...');
  //   console.log('연결 상태:', isConnected);
  //   console.log('스트림 상태:', state);

  //   // 이미 전송 중이면 중단
  //   if (isTransmitting) {
  //     console.log('⚠️ 이미 전송 중입니다.');
  //     return;
  //   }

  //   if (!isConnected) {
  //     console.log('서버에 연결되지 않음');
  //     return;
  //   }

  //   if (!state.isStreaming || !state.stream) {
  //     console.log('비디오 스트림이 준비되지 않음');
  //     return;
  //   }

  //   if (!videoRef.current || videoRef.current.readyState < 2) {
  //     console.log('비디오 엘리먼트가 준비되지 않음');
  //     return;
  //   }

  //   setIsTransmitting(true);

  //   console.log('✅ 전송 시작!');
  //   transmissionIntervalRef.current = setInterval(async () => {
  //     try {
  //       const frame = await captureFrameAsync();
  //       if (frame) {
  //         const success = signClassifierClient.sendVideoChunk(frame);
  //         if (!success) {
  //           console.log('⚠️ 프레임 전송 실패');
  //         }
  //       } else {
  //         console.log('⚠️ 프레임 캡처 실패');
  //       }
  //     } catch (error) {
  //       console.error('프레임 전송 중 오류:', error);
  //       // 전송 오류 시 자동으로 전송 중지
  //       if (transmissionIntervalRef.current) {
  //         clearInterval(transmissionIntervalRef.current);
  //         transmissionIntervalRef.current = null;
  //         setIsTransmitting(false);
  //       }
  //     }
  //   }, 100);
  // };

  // 이 함수로, 실질적인 컨텐츠 타이머 시작
  const handleStartRecording = () => {
    setIsRecording(true);
    setFeedback(null);
    setCurrentResult(null); // 이전 분류 결과 초기화
    console.log('🎬 수어 녹화 시작:', currentSign?.word);
    };

  // 다음 수어(레슨)으로 넘어가는 내용
  const handleNextSign = async () => {
    setCurrentSignIndex(currentSignIndex + 1);  
    // setIsMovingNextSign(false);
    // if (chapter && currentSignIndex < chapter.signs.length - 1) {
    //   setCurrentSignIndex(currentSignIndex + 1);
    //   setFeedback(null);
    // } else {
    //   setSessionComplete(true);
    // }
  };

  // FeedbackDisplay 완료 콜백 함수
  const handleFeedbackComplete = () => {
    console.log('🎉 FeedbackDisplay 완료, 다음 수어로 이동');
    handleNextSign();
  };

  // TODO : id 교체 될 방안을 강구 할 것
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

  useEffect(() => {
    loadAnim();
  }, [currentSign]);

  // 애니메이션 자동 재생 처리 및 프레임 조절
  // 내용 일부라도 바뀌면 재생 속도를 비롯한 환경 전부 엎어짐
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


  // 챕터 아이디를 통해 챕터 첫 준비
  useEffect(() => {
    if (chapterId) {
      const loadChapter = async () => {
        try {
          const lessons = await findLessonsByChapterId(chapterId);
          console.log(lessons);
          console.log("---");
          setLessons(lessons);

          console.log(lessons);
          
        } catch (error) {
          console.error('챕터 데이터 로드 실패:', error);
        }
      };
      loadChapter();
    }
  }, [categoryId, chapterId]);

  useEffect(() => {
    setCurrentSignIndex(0);
   // initializeSession(); // 마운트 혹은 업데이트 루틴

    // 언마운트 루틴
    // return () => {
    //   signClassifierClient.disconnect();
    //   stopStream();
    //   if (transmissionIntervalRef.current) {
    //     clearInterval(transmissionIntervalRef.current);
    //   }
    // };
  }, []);

  // // 애니메이션 파일 교체
  // useEffect(() => {
  //   if (currentSign?.videoUrl) {
  //     loadAnim(currentSign?.videoUrl);
  //   }
  // }, [currentSign?.videoUrl, loadAnim]);

  //======= 비디오 스트림 및 MediaPipe 포즈 감지 =======
  // useEffect(() => {
  //   if (!state.isStreaming || !videoRef.current) return;

  //   console.log('🎯 MediaPipe pose detection 시작');
  //   // 이게 제일 어려움.
  //   const pose = createPoseHandler((rightShoulder, rightWrist, isHandDetected) => {
  //     if (detectTimer.current) {
  //       return;
  //     }
  //     const shoulderVisibility = rightShoulder as typeof rightShoulder & { visibility: number };
  //     const wristVisibility = rightWrist as typeof rightWrist & { visibility: number };
  //     if ((shoulderVisibility.visibility ?? 0) < 0.5 || (wristVisibility.visibility ?? 0) < 0.5) {
  //       setIsHandDetected(false);
  //       initialPose.current = false;
  //       setIsCrossed(false);
  //       return;
  //     }
  //     // 손 감지 상태 업데이트      
  //     if (isHandDetected && rightWrist && rightShoulder) {
  //       if (rightWrist.x < rightShoulder.x) {
  //         initialPose.current = true;
  //         console.log('🤚 초기 포즈 감지됨 (손이 어깨 왼쪽)');
  //       }
  //       if (initialPose.current && rightWrist.x > rightShoulder.x) {
  //         if (!detectTimer.current) {
  //           setIsCrossed(true);
  //           console.log('✋ 손이 어깨를 가로질렀습니다');
  //           detectTimer.current = setTimeout(() => {
  //             detectTimer.current = null;
  //           }, 5000);
  //         }
  //       }
  //     }
  //   });

  //   // TODO: MediaPipe 설정을 외부로 분리 
  //   // 비디오가 준비되면 MediaPipe에 연결
  //   const video = videoRef.current;
  //   if (video.readyState >= 2) {
  //     console.log('📹 비디오 준비됨, MediaPipe 연결 시작');

  //     const processFrame = async () => {
  //       if (video.videoWidth > 0 && video.videoHeight > 0) {
  //         await pose.send({ image: video });
  //       }
  //       if (state.isStreaming) {
  //         requestAnimationFrame(processFrame);
  //       }
  //     };

  //     processFrame();
  //   } else {
  //     // 비디오가 준비될 때까지 대기
  //     const onVideoReady = async () => {
  //       console.log('📹 비디오 준비됨, MediaPipe 연결 시작');

  //       const processFrame = async () => {
  //         if (video.videoWidth > 0 && video.videoHeight > 0) {
  //           await pose.send({ image: video });
  //         }
  //         if (state.isStreaming) {
  //           requestAnimationFrame(processFrame);
  //         }
  //       };

  //       processFrame();
  //     };

  //     video.addEventListener('loadeddata', onVideoReady);
  //     return () => {
  //       video.removeEventListener('loadeddata', onVideoReady);
  //     };
  //   }
  // }, [state.isStreaming, videoRef.current]);

  // 비디오 스트림 준비 완료 시 전송 시작 (클로저 문제 해결)
  // useEffect(() => {
  //   console.log('📊 스트림 상태 변경:', {
  //     isStreaming: state.isStreaming,
  //     hasStream: !!state.stream,
  //     isConnected,
  //     isTransmitting
  //   });

  //   // 모든 조건이 준비되었고 아직 전송 중이 아닐 때 전송 시작
  //   if (state.isStreaming && state.stream && isConnected && !isTransmitting) {
  //     const checkVideoElement = () => {
  //       if (videoRef.current && videoRef.current.readyState >= 2) {
  //         console.log('✅ 비디오 엘리먼트 준비 완료, 전송 시작');
  //         console.log('비디오 readyState:', videoRef.current.readyState);
  //         handleStartTransmission();
  //       } else {
  //         console.log('⏳ 비디오 엘리먼트 준비 중...', {
  //           hasVideoRef: !!videoRef.current,
  //           readyState: videoRef.current?.readyState
  //         });
  //         setTimeout(checkVideoElement, 100);
  //       }
  //     };

  //     // 약간의 지연 후 비디오 엘리먼트 체크
  //     setTimeout(checkVideoElement, 200);
  //   }
  // }, [state.isStreaming, state.stream, isConnected, isTransmitting]);

  // 연결 상태 변경 시 자동 재연결
  // useEffect(() => {
  //   if (isConnected === false) {
  //     console.log('🔄 연결이 끊어짐, 자동 재연결 시도...');
  //     const reconnect = async () => {
  //       try {
  //         setIsConnecting(true);
  //         const success = await attemptConnection(1);
  //         setIsConnected(success);
  //         setIsConnecting(false);

  //         if (success) {
  //           console.log('✅ 자동 재연결 성공');
  //           // 재연결 성공 시 비디오 스트림도 재시작
  //           if (!state.isStreaming) {
  //             await startStream();
  //           }
  //         } else {
  //           console.log('❌ 자동 재연결 실패');
  //         }
  //       } catch (error) {
  //         console.error('자동 재연결 실패:', error);
  //         setIsConnecting(false);
  //       }
  //     };

  //     // 5초 후 재연결 시도
  //     const timeoutId = setTimeout(reconnect, 5000);
  //     return () => clearTimeout(timeoutId);
  //   }
  // }, [isConnected, isConnecting, state.isStreaming]);

  // 연결 상태 주기적 확인
  // useEffect(() => {
  //   const checkConnectionStatus = () => {
  //     const currentStatus = signClassifierClient.getConnectionStatus();
  //     if (currentStatus !== isConnected) {
  //       console.log(`🔗 연결 상태 변경: ${isConnected} → ${currentStatus}`);
  //       setIsConnected(currentStatus);

  //       // 연결이 끊어진 경우 전송 중지
  //       if (!currentStatus && isTransmitting) {
  //         console.log('🔴 연결 끊어짐, 전송 중지');
  //         setIsTransmitting(false);
  //         if (transmissionIntervalRef.current) {
  //           clearInterval(transmissionIntervalRef.current);
  //           transmissionIntervalRef.current = null;
  //         }
  //       }
  //     }
  //   };

  //   const interval = setInterval(checkConnectionStatus, 2000); // 2초마다 확인
  //   return () => clearInterval(interval);
  // }, [isConnected, isTransmitting]);

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

      // 학습 진도 업데이트, 퀴즈에 해당 사항 없나?
      if (isCorrect && currentSign) {
        const currentId = currentSign.id;
        const prevCompleted = JSON.parse(localStorage.getItem('studyword') || '[]');
        const filtered = prevCompleted.filter((id: string) => id !== currentId);
        filtered.push(currentId);
        localStorage.setItem('studyword', JSON.stringify(filtered));
      }


        // if (!isCorrect) {
        //   addToReview(currentSign);
        // }
      

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
  }, [currentResult, currentSign, feedback]);

  // 세션 완료 시 활동 기록
  // useEffect(() => {
  //   if (sessionComplete) {
  //     const recordActivity = async () => {
  //       try {
  //         await API.post('/user/daily-activity/complete', recordActivity);
  //         console.log("오늘 활동 기록 완료!(퀴즈/세션)");
  //       } catch (err) {
  //         console.error("오늘 활동 기록 실패(퀴즈/세션):", err);
  //       }
  //   }
  // }}, [sessionComplete]);

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
              { <LearningDisplay
                data={animData}
                currentFrame={currentFrame}
                currentSign={"학교"}
              /> }
            

            {/* 웹캠 및 분류 결과 */}
             <WebcamSection
              isQuizMode={false}
              isConnected={true}
              isConnecting={false}
              isTransmitting={false}
              state={"a"}
              videoRef={videoRef}
              canvasRef={canvasRef}
              currentResult={"a"}
              connectionError={null}
              isRecording={true}
              feedback={null}
              handleStartRecording={null}
              handleNextSign={null}
              handleRetry={null}
            />
            <Button onClick={handleNextSign}>[DEBUG] 챕터 내 다음 내용으로 넘어가기</Button>
          </div>
    </div>
  );

  // return (
  //   <div className="min-h-screen bg-gray-50 p-6">
  //     <div className="max-w-6xl mx-auto">
  //       <PageHeader
  //         title="단어 학습 세션"
  //         connectionStatus={connectionStatus}
  //         wsList={wsList}
  //         onBack={handleBack}
  //         onShowStatus={showStatus}
  //       />

  //       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  //         {/* 비디오 입력 영역 */}
  //         <div className="space-y-4">
  //           <VideoInput
  //             width={640}
  //             height={480}
  //             autoStart={false}
  //             showControls={true}
  //             onStreamReady={handleStreamReady}
  //             onStreamError={handleStreamError}
  //             className="h-full"
  //           />
            
  //           <StreamingControls
  //             isStreaming={isStreaming}
  //             streamingStatus={streamingStatus}
  //             streamingConfig={streamingConfig}
  //             currentStream={currentStream}
  //             connectionStatus={connectionStatus}
  //             onStartStreaming={startStreaming}
  //             onStopStreaming={stopStreaming}
  //             onConfigChange={setStreamingConfig}
  //           />
            
  //           {/* 숨겨진 비디오 요소들 */}
  //           <div className="hidden">
  //             <video
  //               ref={videoRef}
  //               autoPlay
  //               muted
  //               playsInline
  //               className="w-full h-full object-cover"
  //             />
  //             <canvas ref={canvasRef} />
  //           </div>
  //         </div>
        
  //         {/* 정보 패널 */}
  //         <div className="space-y-6">
  //           <SessionInfo
  //             chapterId={chapterId}
  //             currentStream={currentStream}
  //             connectionStatus={connectionStatus}
  //             wsList={wsList}
  //             isStreaming={isStreaming}
  //             streamInfo={streamInfo}
  //             streamingStatus={streamingStatus}
  //             streamingConfig={streamingConfig}
  //             streamingStats={streamingStats}
  //           />

  //           <SystemStatus
  //             currentStream={currentStream}
  //             connectionStatus={connectionStatus}
  //             wsList={wsList}
  //             isStreaming={isStreaming}
  //             streamingStats={streamingStats}
  //           />

  //           <FeatureGuide
  //             connectionStatus={connectionStatus}
  //             isStreaming={isStreaming}
  //           />
  //         </div>
  //       </div>
  //     </div>
  //   </div>
  // );
};

export default LearnSession;
