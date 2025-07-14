import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, MessageSquare, Play, CheckCircle, RotateCcw, Wifi, WifiOff, Pencil } from 'lucide-react';
import { useLearningData } from '@/hooks/useLearningData';
import { useEffect, useRef, useState } from 'react';
import { Lesson, Chapter, Category } from '../types/learning';
import { useBadgeSystem } from '@/hooks/useBadgeSystem';
import API from '@/components/AxiosInstance';
import useWebsocket, { connectToWebSockets, disconnectWebSockets } from '@/hooks/useWebsocket';
import { useGlobalWebSocketStatus } from '@/contexts/GlobalWebSocketContext';

// 챕터별 상태 계산 함수
// userLessonProgress: { [lessonId: string]: string } 형태로 각 레슨의 상태를 담고 있다고 가정
function getChapterStatus(lessons: Lesson[]) {
  if (!lessons || lessons.length === 0) return 'not_started';
  const allReviewed = lessons.every((lesson) => lesson.status === 'reviewed');
  const anyQuizWrong = lessons.some((lesson) => lesson.status === 'quiz_wrong');
  if (allReviewed) return 'reviewed';
  if (anyQuizWrong) return 'quiz_wrong';
  const allStarted = lessons.every((lesson) => lesson.status && lesson.status !== 'not_started');
  if (allStarted) return 'study';
  return 'not_started';
}

const Chapters = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const [categoryData, setCategoryData] = useState<Category | null>(null);
  const [connectingChapter, setConnectingChapter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 전역 WebSocket 상태 관리
  const { showStatus } = useGlobalWebSocketStatus();
  const { connectionStatus, wsList } = useWebsocket();
  useEffect(() => {

    disconnectWebSockets();

  }, [])
  // navigate(`/learn/chapter/${chapter.id}/guide/2`);
  const handleStartLearn = async (chapterId: string, lessonIds: string[]) => {
    const modeNum = 1;
    const path = `/learn/chapter/${chapterId}/guide/${modeNum}`;
    try {
      setConnectingChapter(chapterId);

      // 1. 챕터 프로그레스 초기화 API 호출 (user_chapter_progress, user_lesson_progress 생성)
      await API.post(`/progress/chapters/${chapterId}`);

      // 2. WebSocket 연결 시도
      try {
        const response = await API.get<{ success: boolean; data: { ws_urls: string[], lesson_mapper: { [key: string]: string } } }>(`/ml/deploy/${chapterId}`);
        if (response.data.success && response.data.data.ws_urls) {
          console.log('[Chapters]response.data.data.lesson_mapper', response.data.data.lesson_mapper);
          await connectToWebSockets(response.data.data.ws_urls);
          showStatus(); // 전역 상태 표시 활성화

          // 학습 진도 이벤트 기록
          await API.post('/progress/lessons/events', { lesson_ids: lessonIds });

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
          showStatus(); // 전역 상태 표시 활성화

          // 학습 진도 이벤트 기록
          await API.post('/progress/lessons/events', { lesson_ids: lessonIds });

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

  useEffect(() => { // 카테고리 데이터 가져오기 및 챕터별 레슨 상태 fetch
    if (!categoryId) return;
    setLoading(true);
    API.get<{ success: boolean; data: Category; message: string }>(`/category/${categoryId}/chapters`)
      .then(async res => {
        const category = res.data.data;
        // 각 챕터별로 lessons fetch
        const chaptersWithLessons = await Promise.all(
          (category.chapters as Chapter[]).map(async (chapter) => {
            try {
              const sessionRes = await API.get<{ success: boolean; data: { lessons: Lesson[] } }>(`/chapters/${chapter.id}/session`);
              return { ...chapter, lessons: sessionRes.data.data.lessons };
            } catch {
              return { ...chapter, lessons: [] };
            }
          })
        );
        setCategoryData({ ...category, chapters: chaptersWithLessons });
        setLoading(false);
      })
      .catch(err => {
        setCategoryData(null);
        setLoading(false);
      });
  }, [categoryId]);

  const isCompleted = useRef(false); // 완료 여부 참조

  // 챕터별 퀴즈 버튼 노출 조건
  function canShowQuizButton(lessons: Lesson[]) {
    if (!lessons || lessons.length === 0) return false;
    // 하나라도 not_started가 아니면 true
    return lessons.some((l) => l.status && l.status !== 'not_started');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">챕터 정보를 불러오는 중...</h2>
        </div>
      </div>
    );
  }
  if (!categoryData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">카테고리를 찾을 수 없습니다</h2>
          <Button onClick={() => navigate('/category')}>돌아가기</Button>
        </div>
      </div>
    );
  }

  const sortedChapters = (categoryData.chapters as Chapter[]).slice(); // 정렬된 챕터 목록

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/category')}
              className="hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              카테고리로
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800">
                {/* {category.icon}  */}
                {categoryData.title}
              </h1>
              <p className="text-sm text-gray-600">{categoryData.description}</p>
            </div>

            {/* WebSocket 연결 상태 표시 */}
            <div className="flex items-center space-x-2">
              {connectionStatus === 'connected' ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-xs">연결됨 ({wsList.length})</span>
                </div>
              ) : connectionStatus === 'connecting' ? (
                <div className="flex items-center space-x-1 text-yellow-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  <span className="text-xs">연결 중...</span>
                </div>
              ) : wsList.length > 0 ? (
                <div className="flex items-center space-x-1 text-red-600">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-xs">연결 안됨</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {sortedChapters.map((chapter, index) => {
            const lessonIds = (chapter.lessons || []).map((lesson: Lesson) => lesson.id);
            const chapterStatus = getChapterStatus(chapter.lessons);
            return (
              <Card key={chapter.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {chapter.type === 'word' ? (
                        <FileText className="h-6 w-6 text-blue-600" />
                      ) : (
                        <MessageSquare className="h-6 w-6 text-green-600" />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span>챕터 {index + 1}: {chapter.title}</span>
                          {chapterStatus === 'reviewed' && (
                            <Badge className="bg-green-500 text-white text-xs flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              완료
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm font-normal text-gray-600">
                          {chapter.type === 'word' ? '단어' : '문장'} • {(chapter.lessons || []).length}개 수어
                        </div>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 진도 표시 */}
                  {/* <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">학습 진도</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {chapterProgress.completed}/{chapterProgress.total} ({chapterProgress.percentage}%)
                      </span>
                    </div>
                    <Progress value={chapterProgress.percentage} className="h-2" />
                  </div> */}

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                    {(chapter.lessons || []).map((lesson) => (
                      <div
                        key={lesson.id}
                        className="text-center p-2 bg-gray-100 rounded text-sm"
                      >
                        {lesson.word}
                      </div>
                    ))}
                  </div>
                  <div className="flex space-x-3 items-center">
                    <Button
                      onClick={() => {
                        handleStartLearn(chapter.id, lessonIds)
                      }}
                      disabled={connectingChapter === chapter.id}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {connectingChapter === chapter.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          연결 중...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          학습하기
                        </>
                      )}
                    </Button>
                    {(chapterStatus === 'study' || chapterStatus === 'quiz_wrong' || chapterStatus === 'reviewed') && (
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          handleStartQuiz(chapter.id, lessonIds)
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        퀴즈 풀기
                      </Button>
                    )}
                    {chapterStatus === 'quiz_wrong' && (
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={async () => {
                          // handleStartReview(chapter.id, lessonIds)
                        }}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        복습하기
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};
export default Chapters;
