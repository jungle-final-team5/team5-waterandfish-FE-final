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
import { useChapterHandler } from '@/hooks/useChapterHandler';
import LoadingFish from "../components/LoadingFish";

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
  const [loading, setLoading] = useState(true);
  const { connectingChapter, handleStartLearn, handleStartQuiz, handleStartReview } = useChapterHandler();
  // 전역 WebSocket 상태 관리
  const { showStatus } = useGlobalWebSocketStatus();
  const { connectionStatus, wsList } = useWebsocket();
  useEffect(() => {

    disconnectWebSockets();

  }, [])
  const handleletter = async (chapter: Chapter, lessonIds: string[]) => {
    let path;
    if (chapter.title == "자음") {
      path = "/test/letter/consonant/study";
    } else if (chapter.title == "모음") {
      path = "/test/letter/vowel/study";
    } else {
      path = "/test/letter/word/study";
    }

    await API.post(`/progress/chapters/${chapter.id}`);
    // status를 'study'로 바꾸는 API 호출 부분 삭제
    await API.post('/progress/lessons/events', { lesson_ids: lessonIds });
    navigate(path);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingFish />
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
  if (categoryData.title == "수어 기초") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50">
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/home')}
                className="hover:bg-blue-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                홈으로
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-800">
                  {/* {category.icon}  */}
                  {categoryData.title}
                </h1>
                <p className="text-sm text-gray-600">{categoryData.description}</p>
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
                          handleletter(chapter, lessonIds)

                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          학습하기
                        </>
                      </Button>
                      {(chapterStatus === 'study' || chapterStatus === 'quiz_wrong' || chapterStatus === 'reviewed') && (
                        <Button
                          className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-300"
                          onClick={() => {
                            handleStartQuiz(chapter.id, lessonIds, `/category/${categoryId}/chapters`);
                          }}
                          disabled={connectingChapter === chapter.id}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          퀴즈 풀기
                        </Button>
                      )}
                      {chapterStatus === 'quiz_wrong' && (
                        <Button
                          className="bg-green-600 hover:bg-green-700"
                          onClick={async () => {
                            navigate(`/learn/chapter/${chapter.id}/guide/3`, { state: { origin: `/category/${categoryId}/chapters` } });
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
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
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
              <h1 className="text-xl font-bold text-gray-800">
                {/* {category.icon}  */}
                {categoryData.title}
              </h1>
              <p className="text-sm text-gray-600">{categoryData.description}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-0 py-10">
        {/* 설명란 (임시) */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">일상 대화 학습 과정</h2>
          <p className="text-gray-600">단계별로 차근차근 배워나가세요. 이전 챕터를 완료해야 다음 챕터를 학습할 수 있습니다.</p>
        </div>
        <div className="px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-20 gap-y-16 relative">
          {sortedChapters.map((chapter, index) => {
              const lessonIds = (chapter.lessons || []).map((lesson) => lesson.id);
              // 상태 예시: completed, current, locked (실제 로직은 추후)
              const status = 'default'; // 'completed' | 'current' | 'locked' | 'default'
            return (
                <div key={chapter.id} className="relative group">
                  {/* 카드 본체 */}
                  <div
                    className={
                      `h-full p-6 rounded-2xl shadow-lg transition-all duration-300 bg-white hover:shadow-xl group-hover:scale-105 flex flex-col justify-between min-h-[300px] h-[340px] max-w-[480px] w-full mx-auto`
                    }
                  >
                    {/* 상태 원 + 진행중 뱃지 */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg bg-white border-4 border-cyan-400 text-cyan-500">
                        {index + 1}
                      </div>
                      {/* 진행중 뱃지 예시 (상태별로 조건부 렌더링) */}
                      {/* <span className="bg-cyan-100 text-cyan-600 px-3 py-1 rounded-full text-sm font-medium">진행 중</span> */}
                    </div>
                    {/* 챕터명 */}
                    <h3 className="text-xl font-bold mb-6 text-gray-800">{chapter.title}</h3>
                    {/* 레슨명 2x2 */}
                    <div>
                      <div className="grid grid-cols-2 gap-4">
                        {(chapter.lessons || []).slice(0, 4).map((lesson) => (
                          <div key={lesson.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-center text-blue-700 text-sm font-medium">
                        {lesson.word}
                      </div>
                    ))}
                        {(chapter.lessons || []).length > 4 && (
                          <div className="col-span-2 text-center text-blue-400 text-xs mt-1">+{(chapter.lessons || []).length - 4}개 더</div>
                        )}
                      </div>
                  </div>
                    <div className="flex-1" />
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl mt-6"
                      onClick={e => { e.stopPropagation(); handleStartLearn(chapter.id, lessonIds, `/category/${categoryId}/chapters`); }}
                      disabled={connectingChapter === chapter.id}
                    >
                      {connectingChapter === chapter.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      학습하기
                    </Button>
                  </div>
                </div>
            );
          })}
          </div>
        </div>
      </main>
    </div>
  );
};
export default Chapters;
