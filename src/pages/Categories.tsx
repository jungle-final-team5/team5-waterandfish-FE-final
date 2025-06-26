
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useLearningData } from '@/hooks/useLearningData';

const Categories = () => {
  const navigate = useNavigate();
  const { categories } = useLearningData();

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
          {categories.map((category) => (
            <Card 
              key={category.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/learn/category/${category.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <span className="text-3xl">{category.icon}</span>
                  <span>{category.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{category.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {category.chapters.length}개 챕터
                  </span>
                  <Button size="sm">
                    <BookOpen className="h-4 w-4 mr-2" />
                    시작하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Categories;
