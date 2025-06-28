
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Trophy, BookOpen, Star, Target, TrendingUp } from 'lucide-react';

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProgressModal = ({ isOpen, onClose }: ProgressModalProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categoryProgress = [
    {
      id: 'greetings',
      title: '일상 인사말',
      icon: '👋',
      progress: 70,
      completedLessons: 7,
      totalLessons: 10,
      color: 'bg-blue-500',
      borderColor: 'border-blue-200',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      description: '기본적인 인사 표현',
      recentActivity: '2시간 전 학습'
    },
    {
      id: 'emotions',
      title: '감정 표현',
      icon: '😊',
      progress: 100,
      completedLessons: 5,
      totalLessons: 5,
      color: 'bg-green-500',
      borderColor: 'border-green-200',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      description: '다양한 감정 표현 방법',
      recentActivity: '어제 완료'
    },
    {
      id: 'family',
      title: '가족 관계',
      icon: '👨‍👩‍👧‍👦',
      progress: 20,
      completedLessons: 2,
      totalLessons: 10,
      color: 'bg-purple-500',
      borderColor: 'border-purple-200',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      description: '가족 구성원 표현',
      recentActivity: '3일 전 학습'
    },
    {
      id: 'daily',
      title: '일상생활',
      icon: '🏠',
      progress: 45,
      completedLessons: 9,
      totalLessons: 20,
      color: 'bg-orange-500',
      borderColor: 'border-orange-200',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      description: '일상 생활 관련 표현',
      recentActivity: '1주일 전 학습'
    },
    {
      id: 'numbers',
      title: '숫자',
      icon: '🔢',
      progress: 0,
      completedLessons: 0,
      totalLessons: 15,
      color: 'bg-gray-400',
      borderColor: 'border-gray-200',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      description: '숫자 표현 방법',
      recentActivity: '아직 시작하지 않음'
    }
  ];

  const overallProgress = Math.round(
    categoryProgress.reduce((sum, cat) => sum + cat.progress, 0) / categoryProgress.length
  );

  const totalCompletedLessons = categoryProgress.reduce((sum, cat) => sum + cat.completedLessons, 0);
  const totalLessons = categoryProgress.reduce((sum, cat) => sum + cat.totalLessons, 0);
  const completedCategories = categoryProgress.filter(cat => cat.progress === 100).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center mb-2">
            📊 학습 진도 현황
          </DialogTitle>
          <p className="text-center text-gray-600">현재까지의 학습 성과를 확인해보세요</p>
        </DialogHeader>

        {/* 전체 통계 요약 */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 text-white mb-8 shadow-lg">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <Trophy className="h-12 w-12 text-yellow-300 mx-auto mb-3" />
              <div className="text-4xl font-bold mb-2">{overallProgress}%</div>
              <p className="text-purple-100">전체 진도율</p>
            </div>
            <div className="text-center">
              <BookOpen className="h-12 w-12 text-blue-200 mx-auto mb-3" />
              <div className="text-4xl font-bold mb-2">{totalCompletedLessons}</div>
              <p className="text-purple-100">완료한 레슨</p>
            </div>
            <div className="text-center">
              <Star className="h-12 w-12 text-green-200 mx-auto mb-3" />
              <div className="text-4xl font-bold mb-2">{completedCategories}</div>
              <p className="text-purple-100">완료한 카테고리</p>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-semibold">전체 진행률</span>
              <span className="text-2xl font-bold">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-4 bg-purple-300/50" />
            <p className="text-purple-100 text-sm mt-2">
              {totalLessons}개 레슨 중 {totalCompletedLessons}개 완료
            </p>
          </div>
        </div>

        {/* 카테고리별 상세 진도 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-2xl font-bold text-gray-800 flex items-center">
              <Target className="h-6 w-6 mr-3 text-blue-600" />
              카테고리별 상세 진도
            </h4>
            <div className="text-sm text-gray-500">
              총 {categoryProgress.length}개 카테고리
            </div>
          </div>
          
          {categoryProgress.map((category) => (
            <div 
              key={category.id} 
              className={`bg-white border-2 ${category.borderColor} rounded-2xl p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className={`w-16 h-16 ${category.bgColor} rounded-2xl flex items-center justify-center text-3xl shadow-sm`}>
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <h5 className="text-xl font-bold text-gray-800 mb-1">{category.title}</h5>
                    <p className="text-gray-600 mb-2">{category.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>📚 {category.completedLessons}/{category.totalLessons} 레슨</span>
                      <span>⏰ {category.recentActivity}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${category.textColor} mb-1`}>
                    {category.progress}%
                  </div>
                  {category.progress === 100 && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <Trophy className="h-4 w-4 mr-1" />
                      완료!
                    </div>
                  )}
                  {category.progress > 0 && category.progress < 100 && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      진행중
                    </div>
                  )}
                  {category.progress === 0 && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      시작 전
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">진행률</span>
                  <span className="text-sm font-bold text-gray-800">{category.progress}%</span>
                </div>
                <Progress value={category.progress} className="h-3" />
                
                <div className="flex justify-between items-center pt-2">
                  <div className="text-sm text-gray-600">
                    다음 목표: {category.progress < 100 ? `${Math.min(category.progress + 20, 100)}% 달성` : '완료됨'}
                  </div>
                  
                  <Button 
                    size="sm" 
                    className={`${category.progress === 0 ? 'bg-blue-600 hover:bg-blue-700' : 
                      category.progress === 100 ? 'bg-green-600 hover:bg-green-700' : 
                      'bg-purple-600 hover:bg-purple-700'} hover:scale-105 transition-all`}
                  >
                    {category.progress === 0 ? '시작하기' : 
                     category.progress === 100 ? '복습하기' : '계속하기'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 학습 동기부여 메시지 */}
        <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-200">
          <div className="text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {overallProgress >= 80 ? '정말 대단해요!' : 
               overallProgress >= 50 ? '절반을 넘었네요!' : 
               '좋은 시작이에요!'}
            </h3>
            <p className="text-gray-600 mb-4">
              {overallProgress >= 80 ? '거의 모든 과정을 완료하셨네요. 정말 훌륭합니다!' : 
               overallProgress >= 50 ? '벌써 절반 이상 완료하셨어요. 계속 화이팅!' : 
               '꾸준히 학습하시면 금세 실력이 늘 거예요!'}
            </p>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="mt-8 flex justify-center">
          <Button onClick={onClose} size="lg" className="px-12 hover:scale-105 transition-transform">
            확인
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProgressModal;