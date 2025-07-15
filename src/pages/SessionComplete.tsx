import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Play } from "lucide-react";
import { useLearningData } from "@/hooks/useLearningData";
import { Chapter, Lesson } from "@/types/learning";
import API from "@/components/AxiosInstance";
import { connectToWebSockets } from "@/hooks/useWebsocket";
import { useToast } from "@/hooks/use-toast";


const SessionComplete = () => {
  // modeNum 1. 기본 학습
  // modeNum 2. 퀴즈 모드
  // modeNum 3. 복습 모드
  const { chapterId: paramChapterId, modeNum: num } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { categories, findChapterById } = useLearningData();
  const chapterId = paramChapterId;
  const [chapterName, setChapterName] = useState<string>('여기에 챕터 이름');
  const modeNum = num ? parseInt(num, 10) : undefined;
  const { totalQuestions, correctCount, wrongCount } = location.state || {};
  const [connectingChapter, setConnectingChapter] = useState<string | null>(null);
  const lessonIds = (findChapterById(chapterId)?.lessons || []).map((lesson: Lesson) => lesson.id);

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


  // chapterID로 이름 받아오는 내용
  useEffect(() => {
    const fetchChapterData = async () => {
      try {
        const res = await API.get(`/chapters/${chapterId}`);
        console.log(res.data);
        setChapterName(res.data.data.type || '챕터 이름 없음');
      }
      catch (error) {
        console.error('Error fetching chapter data:', error);
      }
    };
    fetchChapterData();

  }, []);

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
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center py-12">
          <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-4" />
          {modeNum === 1 && <>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">학습 완료!</h2>
            <p className="text-gray-600 mb-6">좋습니다. {chapterName}의 학습을 완료했습니다.</p>
          </>
          }

          {modeNum === 2 && <>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">퀴즈 완료!</h2>
            <p className="text-gray-600 mb-6">{chapterName} 퀴즈를 끝내셨어요.</p>
            {/* 잘했는지 못했는지 모르니 중립적으로 작성하기*/}
            {}
          </>
          }

          {modeNum === 3 && <>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">복습 완료!</h2>
            <p className="text-gray-600 mb-6">{chapterName}을 좀 치고 계십니다!</p>
          </>
          }

          {modeNum !== 2 && <p className="text-gray-600 mb-6">기깔난 것 </p>}
          {modeNum === 2 &&
            <>  {wrongCount > 0 && (
              <span className="text-red-600"> 틀린 문제: {wrongCount}개</span>
            )}</>}
          <div className="flex justify-center space-x-4">
            {modeNum === 1 &&
              <Button
                onClick={() => {
                  handleStartQuiz(chapterId, lessonIds)
                }}
                className="bg-blue-600 hover:bg-blue-700">
                {connectingChapter === chapterId ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    연결 중...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    퀴즈풀기
                  </>
                )}
              </Button>}
            {modeNum === 2 && (
              <>
                <Button onClick={() => navigate(`/learn/chapter/${chapterId}/guide/3`)} className="bg-blue-600 hover:bg-blue-700">
                  연이어 복습하기 - 복습 대상 아이템이 있는 경우에 한함
                </Button>
              </>
            )}
            <Button onClick={() => navigate('/home')} className="bg-blue-600 hover:bg-blue-700">
              홈으로 돌아가기
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SessionComplete;