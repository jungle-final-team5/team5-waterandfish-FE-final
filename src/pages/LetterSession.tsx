import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useRef, useState } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawLandmarks, drawOverlayMessage } from '../components/draw/draw';
import { detectGesture } from '../components/draw/RightDetector';
import API from '@/components/AxiosInstance';
import SessionHeader from '@/components/SessionHeader';
import LetterDisplay from '@/components/LetterDisplay';

const LetterSession = () => {
  const [gesture, setGesture] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setType,qOrs } = useParams();
  const [sets] = useState(() => {
    if (setType === 'consonant') {
      return ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
    } else if (setType === 'vowel') {
      return ['ㅏ', 'ㅑ', 'ㅓ', 'ㅕ','ㅗ','ㅛ','ㅜ','ㅠ','ㅡ','ㅣ'];
    } else {
      return [];
    }
  });
  const sendQuizResult = async () => {
    const passedLetters = JSON.parse(localStorage.getItem('passed') || '[]');
    const failedLetters = JSON.parse(localStorage.getItem('failed') || '[]');

    try {
      await API.post(
        'learning/result/letter',
        {
          passed: passedLetters,
          failed: failedLetters,
        },
        {
          withCredentials: true, // ✅ 쿠키 포함
        }
      );
      console.log("결과 전송 완료");
      // 선택: localStorage 초기화
      localStorage.removeItem('passed');
      localStorage.removeItem('failed');
    } catch (error) {
      console.error("결과 전송 실패", error);
    }
  };
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const times = useRef(10);
  const qors = useRef<boolean>(qOrs === 'quiz');
  const timeref = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const decref = useRef<HTMLDivElement | null>(null);
  const pileref = useRef<HTMLDivElement | null>(null);

  const ges = useRef<string | null>(null);
  const pges = useRef<string | null>(null);
  const std = useRef<boolean>(false);
  const navigated = useRef<boolean>(false);

  const [words, setWords] = useState('');

  const handleNext = () => {
    setProgressPercent(0);
    if (currentIndex < sets.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  


  const timedown = () => {
    if (times.current === 1) {
      times.current -= 1;
      std.current = false;
      navigated.current = true;
      if (decref.current) decref.current.textContent = '실패';
      if (timeref.current) timeref.current.textContent = times.current.toString();

      const failedChar = sets[currentIndex];
      const prevFailed = JSON.parse(localStorage.getItem('failed') || '[]');

      const newFailed = prevFailed.filter((c: string) => c !== failedChar);
      newFailed.push(failedChar);

      localStorage.setItem('failed', JSON.stringify(newFailed));

      setIsDone(true);
      setTimeout(handleNext, 2000);
    } else if (times.current > 1) {
      times.current -= 1;
      if (timeref.current) {
        timeref.current.textContent = times.current.toString();
      }
    }

    if (std.current) {
      setTimeout(timedown, 1000);
    }
  };

  const divword = (word: string) => {
    if (!decref.current || !pileref.current) return;
    decref.current.textContent = '';
    setIsDone(false);
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const code = char.charCodeAt(0);
      if (code >= 0x3131 && code <= 0x318E) {
        decref.current.textContent += char;
      }
    }
    pileref.current.textContent = '';
    if(qors.current){
      times.current = 10;
      if (timeref.current) timeref.current.textContent = times.current.toString();
    }
  };

// 타이머 관련 상태 추가
const [gestureRecognitionActive, setGestureRecognitionActive] = useState(false);
const gestureTimerRef = useRef<NodeJS.Timeout | null>(null);
const startTimeRef = useRef<number | null>(null);

useEffect(() => {
  pges.current = ges.current;
    navigated.current = false;
    setProgressPercent(0);
    
  if (pges.current != null && ges.current != null) {
    if ( pges.current === ges.current &&
      decref.current?.textContent?.[0] === pges.current
    ) {

      // 이미 타이머가 실행 중이 아니라면 타이머 시작
      if (!gestureTimerRef.current) {
        console.log("제스처 인식 시작:", ges.current);
        setGestureRecognitionActive(true);
        startTimeRef.current = Date.now();
        
        // 프로그레스 바 애니메이션 시작
        const updateProgress = () => {
          if (!startTimeRef.current) return;
          
          const elapsed = Date.now() - startTimeRef.current;
          const percent = Math.min((elapsed / 800) * 100, 100);
          setProgressPercent(percent);
          
          if (percent < 100) {
            requestAnimationFrame(updateProgress);
          }
        };
        
        requestAnimationFrame(updateProgress);
        
        // 0.6초 타이머 설정
        gestureTimerRef.current = setTimeout(() => {
          console.log("0.6초 유지 성공! 제스처:", ges.current);
          setProgressPercent(100);
          
          // 여기서 제스처 인식 성공 처리
          if (pileref.current && decref.current?.textContent) {
            pileref.current.textContent += pges.current;
            decref.current.textContent = decref.current.textContent.replace(pges.current!, '');
            
            if (decref.current.textContent === '' && !navigated.current) {
              std.current = false;
              navigated.current = true;
              decref.current.textContent = '통과';
              setIsDone(true);
              
              const passedChar = sets[currentIndex];
              const prevPassed = JSON.parse(localStorage.getItem('passed') || '[]');
              const newPassed = prevPassed.filter((c: string) => c !== passedChar);
              newPassed.push(passedChar);
              localStorage.setItem('passed', JSON.stringify(newPassed));
              
              setTimeout(handleNext, 2000);
            }
          }
          
          // 타이머 초기화
          gestureTimerRef.current = null;
          setGestureRecognitionActive(false);
          
          pges.current = null;
        }, 800);
      }
    } else {
      // 제스처가 변경되었거나 일치하지 않으면 타이머 취소
      if (gestureTimerRef.current) {
        clearTimeout(gestureTimerRef.current);
        gestureTimerRef.current = null;
        setGestureRecognitionActive(false);
        setProgressPercent(0);
        console.log("제스처 변경으로 인식 취소");
      }
    }
  } else {
    // 제스처가 없으면 타이머 취소
    if (gestureTimerRef.current) {
      clearTimeout(gestureTimerRef.current);
      gestureTimerRef.current = null;
      setGestureRecognitionActive(false);
      setProgressPercent(0);
      console.log("제스처 없음으로 인식 취소");
    }
  }
  
  // 컴포넌트 언마운트 시 타이머 정리
  return () => {
    if (gestureTimerRef.current) {
      clearTimeout(gestureTimerRef.current);
      gestureTimerRef.current = null;
    }
  };
}, [gesture]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setWords(sets[currentIndex]);
  }, [currentIndex]);

  useEffect(() => {
    if (!words) return;
    std.current = true;
    divword(words);
    
    if(qors.current){
      setTimeout(timedown, 1000);
    }
  }, [words]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const resultElement = resultRef.current;

    if (!videoElement || !canvasElement || !resultElement) return;
    const canvasCtx = canvasElement.getContext('2d');
    if (!canvasCtx) return;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results: any) => {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const handvc = Math.sqrt(
          (landmarks[0].y - landmarks[9].y) ** 2 +
          (landmarks[0].x - landmarks[9].x) ** 2
        );

        if (handvc > 0.13 && handvc <= 0.5) {
          drawLandmarks(canvasCtx, landmarks, canvasElement);
          const gesture = detectGesture(landmarks);
          if (gesture) {
            resultElement.textContent = `🖐️ ${gesture}`;
            ges.current = gesture;
            setGesture(gesture);
          } else {
            resultElement.textContent = 'Hand detected';
            ges.current = null;
            setProgressPercent(0);
            setGesture(null);
          }
        } else {
          drawOverlayMessage(
            canvasCtx,
            canvasElement,
            handvc <= 0.13 ? '손을 앞으로 옮겨주세요' : '손을 뒤로 빼주세요'
          );
          ges.current = null;
        }
      } else {
        resultElement.textContent = 'Waiting for hand...';
        setProgressPercent(0);
      }
      canvasCtx.restore();
    });

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await hands.send({ image: videoElement });
      },
      width: 640,
      height: 480,
    });

    camera.start();
  }, []);

  const progress = (currentIndex / sets.length) * 100;

  if(isDone && currentIndex === sets.length - 1)
  {
      return (
          <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">끝내준다!!</h1>
          <Button onClick={() => navigate('/home')}>돌아가기</Button>
        </div>
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
        progress={progress}
        categoryId={undefined}
        navigate={navigate}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {qors.current?(<div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>현재 문제</CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={decref} className="text-5xl text-center font-bold" />
                <div ref={timeref} className="text-center text-gray-600 mt-2" />
                <div ref={pileref} className="text-center text-3xl mt-4" />
              </CardContent>
            </Card>
          </div>):(<div className="space-y-6">
            <Card>
              <CardHeader>
                {setType === 'consonant'?(<CardTitle>자음 연습</CardTitle>):
                (<CardTitle>모음 연습</CardTitle>)}
{/* 빈 트랙은 항상 */}
<div className="mt-2">
  <div className="w-full bg-gray-200 rounded-full h-2.5">
    {/* 채워지는 부분은 progressPercent에 따라 넓이만 변함 */}
    <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-[800ms] ease-linear"
      style={{ width: `${progressPercent}%` }}
    />
  </div>

  {/* 인식 중 텍스트만 활성 상태에서 노출 */}
  {gestureRecognitionActive && (
    <div className="text-xs text-center mt-1 text-gray-500">
      인식 중...
    </div>
  )}
  </div>
                                
              </CardHeader>
              <CardContent>
                <div ref={decref} className="text-5xl text-center font-bold" />
                  <LetterDisplay isVowel={setType !== 'consonant'} progress={currentIndex + 1}/>
                <div ref={pileref} className="text-center text-3xl mt-4" />
              </CardContent>
            </Card>
          </div>)}

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>손 모양 인식</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <video ref={videoRef} style={{ display: 'none' }} autoPlay muted playsInline width="640" height="480" />
                <canvas ref={canvasRef} width="640" height="480" className="border border-gray-300"  style={{ transform: 'scaleX(-1)' }}/>
                <div ref={resultRef} className="text-center text-xl mt-4" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LetterSession;