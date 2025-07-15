import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Play } from "lucide-react";
import { useLearningData } from "@/hooks/useLearningData";
import { Chapter, Lesson } from "@/types/learning";
import API from "@/components/AxiosInstance";
import { connectToWebSockets } from "@/hooks/useWebsocket";
import { useToast } from "@/hooks/use-toast";
import { useBadgeSystem } from "@/hooks/useBadgeSystem";
import confetti from 'canvas-confetti';


const SessionComplete = () => {
  // modeNum 1. 기본 학습
  // modeNum 2. 퀴즈 모드
  // modeNum 3. 복습 모드
  const { chapterId: paramChapterId, modeNum: num } = useParams();
  const { checkBadges } = useBadgeSystem();
  const [badgeData, setBadgeData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { categories, findChapterById } = useLearningData();
  const chapterId = paramChapterId;
  const [chapterName, setChapterName] = useState<string>('여기에 챕터 이름');
  const [lessons, setLessons] = useState<Lesson[]>([]); // 추가: lessons 상태
  const modeNum = num ? parseInt(num, 10) : undefined;
  const { totalQuestions, correctCount, wrongCount } = location.state || {};
  const [connectingChapter, setConnectingChapter] = useState<string | null>(null);
  const lessonIds = lessons.map((lesson: Lesson) => lesson.id); // 수정: lessons 상태에서 lessonIds 추출

  const handlePerfectQuiz = async () => {
    toast({ title: "완벽해요", description: "단 한 개도 틀린게 없네요! 대단합니다!!" });
  }

  const handlePerfectReview = async () => {
    toast({ title: "깔끔한 리뷰!", description: "이 챕터의 모든 수어를 마스터했습니다!!" });
  }

useEffect(() => {
  if (modeNum === 2 && wrongCount === 0) {
    handlePerfectQuiz();
  }
  
  if (modeNum === 3) {
    handlePerfectReview();
  }
}, [modeNum, wrongCount]);

  const handleStartQuiz = async (chapterId: string, lessonIds: string[]) => {
    const modeNum = 2;
    const path = `/learn/chapter/${chapterId}/guide/${modeNum}`;
    try {
      setConnectingChapter(chapterId);

      // WebSocket 연결 시도
      try {
        const response = await API.get<{ success: boolean; data: { ws_urls: string[], lesson_mapper: { [key: string]: string } } }>(`/ml/deploy/${chapterId}`);
        if (response.data.success && response.data.data.ws_urls) {
          console.log('[Chapters]response.data.data.lesson_mapper', response.data.data.lesson_mapper);
          await connectToWebSockets(response.data.data.ws_urls);

          // 학습 진도 이벤트 기록
          await API.post('/progress/lessons/events', { lesson_ids: lessonIds, mode: 'review' });

          // lesson_mapper를 URL state로 전달
          navigate(path, {
            state: {
              lesson_mapper: response.data.data.lesson_mapper
            }
          });
          return; // 성공적으로 처리되었으므로 함수 종료
        }
      } catch (wsError) {
        console.warn('WebSocket 연결 실패:', wsError);
        // WebSocket 연결 실패해도 페이지 이동은 계속 진행
      }

      setConnectingChapter(null);
      navigate(path);
    } catch (err) {
      console.error('학습 시작 실패:', err);
      setConnectingChapter(null);
      navigate(path); // 실패해도 이동
    }
  };

  // 번호 배정이 이상하면 home으로 보내버린다
  useEffect(() => {
    if (!modeNum) {
      navigate('/home');
    }
  }, [modeNum, navigate]);


  // chapterID로 이름과 lessons 받아오는 내용
  useEffect(() => {
    const fetchChapterData = async () => {
      try {
        const res = await API.get(`/chapters/${chapterId}`);
        console.log(res.data);
        setChapterName(res.data.data.type || '챕터 이름 없음');
        // lessons도 fetch
        const chapter = await findChapterById(chapterId);
        if (chapter && Array.isArray(chapter.lessons)) {
          setLessons(chapter.lessons);
        } else {
          setLessons([]);
        }
      }
      catch (error) {
        console.error('Error fetching chapter data:', error);
        setLessons([]);
      }
    };
    fetchChapterData();

 const fetchBadges = async () => {
    try {
      // 두 번?
      await checkBadges("");
      const badgeResponse = await checkBadges("");
      console.log("뱃지 응답:", badgeResponse);
      
      // newly_awarded_badges 배열이 있고 비어있지 않은 경우에만 설정
      if (badgeResponse.newly_awarded_badges && badgeResponse.newly_awarded_badges.length > 0) {
        setBadgeData(badgeResponse.newly_awarded_badges);
      }
    } catch (error) {
      console.error("뱃지 확인 중 오류 발생:", error);
    }
  };
  
  fetchBadges();

  }, []);


// badgeData가 변경될 때 toast를 표시하는 useEffect 수정
useEffect(() => {
  if (badgeData && Array.isArray(badgeData) && badgeData.length > 0) {
    // 배열인 경우 각 뱃지에 대해 toast 표시
    badgeData.forEach(badge => {
      toast({
        title: `새 뱃지 획득: ${badge.name || '새 뱃지'}`,
        description: badge.description || '축하합니다! 새로운 뱃지를 획득했습니다.',
        duration: 5000
      });
    });
  }
}, [badgeData, toast]);

  // 반짝이 SVG 컴포넌트
  const Sparkle = ({ style }: { style: React.CSSProperties }) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={style} className="absolute z-20 pointer-events-none animate-sparkle">
      <g filter="url(#glow)">
        <path d="M16 2 L18 14 L30 16 L18 18 L16 30 L14 18 L2 16 L14 14 Z" fill="#facc15"/>
      </g>
      <defs>
        <filter id="glow" x="-10" y="-10" width="52" height="52" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    </svg>
  );

  // 랜덤 위치에 반짝이 여러 개 생성
  const SparkleLayer = () => {
    const sparkles = Array.from({ length: 10 }).map((_, i) => {
      const top = Math.random() * 80 + 5; // 5~85%
      const left = Math.random() * 80 + 10; // 10~90%
      const delay = Math.random() * 2;
      return <Sparkle key={i} style={{ top: `${top}%`, left: `${left}%`, animationDelay: `${delay}s` }} />;
    });
    return <>{sparkles}</>;
  };

  const fireConfetti = () => {
    // 왼쪽
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
      colors: ['#facc15', '#a5b4fc', '#fbcfe8', '#f9a8d4', '#c7d2fe', '#34d399', '#fff'],
      scalar: 1.2
    });
    // 오른쪽
    confetti({
      particleCount: 60,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
      colors: ['#facc15', '#a5b4fc', '#fbcfe8', '#f9a8d4', '#c7d2fe', '#34d399', '#fff'],
      scalar: 1.2
    });
  };

  useEffect(() => {
    // 2초간 연속 confetti 발사
    let count = 0;
    const interval = setInterval(() => {
      fireConfetti();
      count++;
      if (count > 4) clearInterval(interval);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white relative overflow-hidden">
      {/* 폭죽 효과를 위한 canvas-confetti는 자동으로 body에 그려집니다 */}
      <main className="relative z-10 w-full max-w-md mx-auto">
        <div className="bg-white/90 rounded-3xl shadow-2xl px-8 py-12 flex flex-col items-center text-center border border-purple-100">
          {/* 완료 아이콘 및 이모지 */}
          <div className="mb-6">
            {modeNum === 1 && <span className="text-6xl animate-bounce">🎉</span>}
            {modeNum === 2 && <span className="text-6xl animate-bounce">🏆</span>}
            {modeNum === 3 && <span className="text-6xl animate-bounce">🫶🏻</span>}
          </div>
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4 drop-shadow-lg animate-fade-in" />
          {/* 완료 메시지 */}
          {modeNum === 1 && <>
            <h2 className="text-3xl font-extrabold text-purple-700 mb-2 animate-fade-in">학습 완료!</h2>
            <p className="text-gray-700 mb-6 animate-fade-in-slow">{chapterName}의 학습을 완료했습니다!<br/>수고하셨어요! 👏</p>
          </>}
          {modeNum === 2 && <>
            <h2 className="text-3xl font-extrabold text-green-700 mb-2 animate-fade-in">퀴즈 완료!</h2>
            <p className="text-gray-700 mb-6 animate-fade-in-slow">{chapterName}의 퀴즈를 완료했습니다!<br/>수고하셨어요! 🥳</p>
          </>}
          {modeNum === 3 && <>
            <h2 className="text-3xl font-extrabold text-blue-700 mb-2 animate-fade-in">복습 완료!</h2>
            <p className="text-gray-700 mb-6 animate-fade-in-slow">{chapterName}의 복습을 완료했습니다!<br/>완벽한 마무리! 💯</p>
          </>}
          {/* 틀린 문제 표시 */}
          {modeNum === 2 &&
            <>{wrongCount > 0 && (
              <span className="text-red-600 font-semibold text-lg animate-shake">❌ 틀린 문제: {wrongCount}개</span>
            )}</>}
          {modeNum === 2 && (
            <div className="mb-4 text-xl font-bold text-indigo-700 flex flex-col items-center">
              <span className="text-3xl font-extrabold text-indigo-800">
                {(typeof correctCount === 'number' ? correctCount : 0)} /
                {(lessons.length > 0 ? lessons.length : (typeof totalQuestions === 'number' ? totalQuestions : 0))}
              </span>
            </div>
          )}
          {/* 버튼 영역 */}
          <div className="flex flex-col gap-4 mt-8 w-full">
            {modeNum === 1 &&
              <Button
                onClick={() => {
                  handleStartQuiz(chapterId, lessonIds)
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg py-3 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center">
                {connectingChapter === chapterId ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    연결 중...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    퀴즈풀기
                  </>
                )}
              </Button>}
            {modeNum === 2 && (
              <Button onClick={() => navigate(`/learn/chapter/${chapterId}/guide/3`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg py-3 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center">
                연이어 복습하기
              </Button>
            )}
            <Button onClick={() => navigate('/home')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg py-3 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center">
              홈으로 돌아가기
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SessionComplete;