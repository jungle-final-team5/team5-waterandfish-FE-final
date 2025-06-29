
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, CheckCircle } from 'lucide-react';
import { useLearningData } from '@/hooks/useLearningData';

const Categories = () => {
  const navigate = useNavigate();
  const { categories, getCategoryProgress, isCategoryCompleted } = useLearningData();

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
              <h1 className="text-xl font-bold text-gray-800">학습 카테고리</h1>
              <p className="text-sm text-gray-600">배우고 싶은 주제를 선택하세요</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const categoryProgress = getCategoryProgress(category);
            const isCompleted = isCategoryCompleted(category.id);
            
            return (
              <Card 
                key={category.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer relative"
                onClick={() => navigate(`/learn/category/${category.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{category.icon}</span>
                      <span>{category.title}</span>
                    </div>
                    {isCompleted && (
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        완료
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{category.description}</p>
                  
                  {/* 진도 표시 */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">진도</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {categoryProgress.completed}/{categoryProgress.total} ({categoryProgress.percentage}%)
                      </span>
                    </div>
                    <Progress value={categoryProgress.percentage} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {category.chapters.length}개 챕터
                    </span>
                    <Button size="sm">
                      <BookOpen className="h-4 w-4 mr-2" />
                      {isCompleted ? '복습하기' : '시작하기'}
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

export default Categories;