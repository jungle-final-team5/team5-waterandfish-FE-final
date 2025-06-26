
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Search, 
  RotateCcw, 
  Trophy, 
  Calendar,
  Target,
  User,
  Settings
} from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">🤟</span>
              </div>
              <span className="text-xl font-bold text-gray-800">SignSense</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            안녕하세요, 학습자님! 👋
          </h1>
          <p className="text-gray-600">오늘도 수어 학습을 시작해볼까요?</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Button
            onClick={() => navigate('/search')}
            className="h-24 bg-blue-600 hover:bg-blue-700 flex-col space-y-2"
          >
            <Search className="h-8 w-8" />
            <span className="text-lg">수어 검색</span>
          </Button>

          <Button
            onClick={() => navigate('/learn')}
            variant="outline"
            className="h-24 hover:bg-blue-50 flex-col space-y-2"
          >
            <BookOpen className="h-8 w-8" />
            <span className="text-lg">학습하기</span>
          </Button>

          <Button
            onClick={() => navigate('/review')}
            variant="outline"
            className="h-24 hover:bg-green-50 flex-col space-y-2"
          >
            <RotateCcw className="h-8 w-8" />
            <span className="text-lg">복습하기</span>
          </Button>
        </div>

        {/* Dashboard Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 최근 학습 */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">최근 학습</h3>
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-2">기본 인사말</p>
            <p className="text-2xl font-bold text-gray-800">안녕하세요</p>
          </div>

          {/* 연속 학습 */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">연속 학습</h3>
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-2">연속 학습 일수</p>
            <p className="text-2xl font-bold text-green-600">7일 🔥</p>
          </div>

          {/* 획득 뱃지 */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">획득한 뱃지</h3>
              <Trophy className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="text-sm text-gray-600 mb-2">총 뱃지 개수</p>
            <p className="text-2xl font-bold text-yellow-600">3개 🏆</p>
          </div>

          {/* 전체 진도율 */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">전체 진도율</h3>
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 mb-2">전체 과정</p>
            <p className="text-2xl font-bold text-purple-600">35%</p>
          </div>
        </div>

        {/* 오늘의 문장 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white mb-8">
          <h3 className="text-xl font-semibold mb-2">오늘의 문장</h3>
          <p className="text-2xl font-bold mb-4">"수고하셨습니다"</p>
          <Button 
            variant="secondary"
            onClick={() => navigate('/learn/수고하셨습니다')}
          >
            지금 배우기
          </Button>
        </div>

        {/* 추천 학습 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">추천 학습</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
              <h4 className="font-medium text-gray-800 mb-2">일상 인사말</h4>
              <p className="text-sm text-gray-600 mb-3">기본적인 인사 표현을 배워보세요</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-600">진도: 70%</span>
                <Button size="sm" variant="outline">계속하기</Button>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
              <h4 className="font-medium text-gray-800 mb-2">감정 표현</h4>
              <p className="text-sm text-gray-600 mb-3">다양한 감정을 수어로 표현해보세요</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600">진도: 완료</span>
                <Button size="sm" variant="outline">복습하기</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
