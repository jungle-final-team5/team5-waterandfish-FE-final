import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import API from '@/components/AxiosInstance';
import { Lesson } from '@/types/learning';

// 챕터별 그룹 타입
interface ChapterGroup {
  chapter_title: string;
  lessons: Lesson[];
}

const Review = () => {
  const navigate = useNavigate();
  const [chapterGroups, setChapterGroups] = useState<ChapterGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFailedLessons() {
      setLoading(true);
      setError(null);

      try {
        const res = await API.get("/progress/failures/me");
        const lessons: Lesson[] = (res.data as any).data;

        // 챕터별로 그룹핑 (chapter_title 사용)
        const groupMap: { [chapter_title: string]: Lesson[] } = {};
        lessons.forEach(lesson => {
          const chapterTitle = lesson.chapter_title || "알 수 없음";
          if (!groupMap[chapterTitle]) {
            groupMap[chapterTitle] = [];
          }
          groupMap[chapterTitle].push(lesson);
        });

        // 그룹 데이터 생성
        const groups: ChapterGroup[] = Object.entries(groupMap).map(([chapter_title, lessons]) => ({
          chapter_title,
          lessons
        }));

        setChapterGroups(groups);
      } catch (err: unknown) {
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
        if (err instanceof Error) {
          console.error(err.message);
        } else {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchFailedLessons();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">복습 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
              <h1 className="text-xl font-bold text-gray-800">복습하기</h1>
              <p className="text-sm text-gray-600">틀렸던 수어들을 챕터별로 복습하세요</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {chapterGroups.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-20 w-20 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-600 mb-2">복습할 내용이 없습니다</h2>
            <p className="text-gray-500 mb-6">퀴즈에서 틀린 문제들이 여기에 표시됩니다.</p>
            <Button onClick={() => navigate('/learn')}>
              학습하러 가기
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {chapterGroups.map((group, index) => (
              <Card
                key={index}
                className="hover:shadow-lg transition-shadow rounded-lg p-6 flex flex-col min-h-[180px]"
              >
                <CardHeader className="p-0 mb-2">
                  <CardTitle className="flex items-center space-x-3 text-2xl font-bold text-blue-700">
                    <span className="text-3xl">📚</span>
                    <span>{group.chapter_title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="text-gray-600 text-sm mt-4 mb-2">
                    {" "}
                    <span className="font-semibold text-lg text-gray-800">
                      {group.lessons.map(sign => sign.word).join("  |   ")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span />
                    <Button
                      size="sm"
                      className="w-28"
                      onClick={e => {
                        e.stopPropagation();
                        if (group.lessons.length > 0) {
                          navigate(`/learn/chapter/${group.lessons[0].chapter_id}/guide/3`);
                        }
                      }}
                    >
                      복습하기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Review;
