import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, MessageSquare, Play, CheckCircle, RotateCcw } from 'lucide-react';
import { useLearningData } from '@/hooks/useLearningData';
import { useEffect, useRef, useState } from 'react';
import {Lesson,Chapter,Category} from '../types/learning';
import API from '@/components/AxiosInstance';

const Chapters = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const [categoryData, setCategoryData] = useState<Category | null>(null);
  const startChapterProgress = async (chapterId: string, path: string) => {
  try {
    await API.post("learning/progress/chapter/set", {
      chapid: chapterId,
    });
    navigate(path);
  } catch (err) {
    console.error("프로그레스 초기화 실패:", err);
    alert("학습을 시작할 수 없습니다. 잠시 후 다시 시도해주세요.");
  }
};
  useEffect(() => {
    if (!categoryId) return;

    API.get<Category>(`/learning/chapter/${categoryId}`)
      .then(res => setCategoryData(res.data))
      .catch(err => console.error('카테고리 정보 불러오기 실패:', err));
  }, [categoryId]);
  const isCompleted = useRef(false);
  if (!categoryData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">카테고리를 찾을 수 없습니다</h2>
          <Button onClick={() => navigate('/learn')}>돌아가기</Button>
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
              onClick={() => navigate('/learn')}
              className="hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              카테고리로
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

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {categoryData.chapters.map((chapter, index) => {
            // const chapterProgress = getChapterProgress(chapter);
            // const isCompleted = isChapterCompleted(chapter.id);
            
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
                          {isCompleted && (
                            <Badge className="bg-green-500 text-white text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              완료
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm font-normal text-gray-600">
                          {chapter.type === 'word' ? '단어' : '문장'} • {chapter.signs.length}개 수어
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
                    {chapter.signs.map((lesson) => (
                      <div 
                        key={lesson.id}
                        className="text-center p-2 bg-gray-100 rounded text-sm"
                      >
                        {lesson.word}
                      </div>
                    ))}
                  </div>
                  <div className="flex space-x-3">
                    <Button 
                      onClick={() => startChapterProgress(
                                      chapter.id,
                                      `/learn/session/${categoryId}/${chapter.id}/learning`
                                      )}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      학습하기
                    </Button>
                    <Button 
                      onClick={() => navigate(`/learn/session/${categoryId}/${chapter.id}/learning`)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      복습하기
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => startChapterProgress(
                                      chapter.id,
                                      `/learn/session/${categoryId}/${chapter.id}/quiz`
                                      )}
                    >
                      퀴즈 풀기
                    </Button>
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