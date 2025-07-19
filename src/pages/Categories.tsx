import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, CheckCircle } from 'lucide-react';
import { useLearningData } from '@/hooks/useLearningData';
import { useEffect, useRef, useState } from 'react';
import API from '@/components/AxiosInstance';
import { Category } from '@/types/learning';
import { disconnectWebSockets } from '@/hooks/useWebsocket';
import { HomeOutlined, BookOutlined, ReloadOutlined } from '@ant-design/icons';

const Categories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const isCompleted = useRef(false);
  useEffect(() => {
     
      disconnectWebSockets();
    
  }, []);
  useEffect(() => {
    API.get<{ success: boolean; data: Category[]; message: string }>('/category/list')
      .then(res => {
        setCategories(res.data.data);
      })
      .catch(err => {
        console.error('카테고리 불러오기 실패');
        if (err.response) {
          console.error('서버 응답 에러:', err.response.status, err.response.data);
        } else if (err.request) {
          console.error('요청은 전송됐지만 응답 없음:', err.request);
        } else {
          console.error('요청 설정 에러:', err.message);
        }
      });
  }, []);

  const startCategoryProgress = async (categoryId: string, path: string) => {
    try {
      await API.post(`/progress/categories/${categoryId}`, {});
      navigate(path);
    } catch (err) {
      console.error('프로그레스 초기화 실패:', err);
      alert('학습을 시작할 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const sortedCategories: Category[] = categories.slice().sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100">
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
              <h1 className="text-xl font-bold text-gray-800">학습 카테고리</h1>
              <p className="text-sm text-gray-600">배우고 싶은 주제를 선택하세요</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCategories.map((category) => (
            <Card
              key={category.id}
              tabIndex={0}
              className="hover:shadow-lg transition-shadow cursor-pointer relative focus:outline-none focus:ring-4 focus:ring-indigo-300 hover:ring-4 hover:ring-indigo-200"
              onClick={() => navigate(`/category/${category.id}/chapters`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <span className="text-3xl">{category.emoji}</span>
                  <span>{category.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>{category.description}</div>
                <div style={{ marginTop: 8, color: "#888" }}>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                  </span>
                  <Button
                    onClick={() => {
                      try{
                        API.post(`/progress/categories/${category.id}`);
                        navigate(`/category/${category.id}/chapters`);
                      }catch (error) {
                        console.error('카테고리 시작 실패:', error);
                        alert('진행도 초기화 불가');
                      }
                    }}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    {isCompleted.current ? '복습하기' : '시작하기'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-indigo-700 px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center space-x-12">
            <div className="flex flex-col items-center cursor-pointer text-gray-400 hover:text-white transition-colors"
              onClick={() => navigate('/home')}>
              <HomeOutlined className="text-2xl mb-1" />
              <span className="text-xs font-medium">홈</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer text-white"
              onClick={() => navigate('/category')}>
              <BookOutlined className="text-2xl mb-1" />
              <span className="text-xs font-medium">학습</span>
            </div>
          </div>
        </div>
      </div>
      {/* Bottom padding to account for fixed navigation */}
      <div className="h-20"></div>
    </div>
  );
};

export default Categories;