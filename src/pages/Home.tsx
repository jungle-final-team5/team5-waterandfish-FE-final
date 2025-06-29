import { useState, useEffect } from 'react';
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
  LogOut
} from 'lucide-react';
import BadgeModal from '@/components/BadgeModal';
import StreakModal from '@/components/StreakModal';
import ProgressModal from '@/components/ProgressModal';
import { useToast } from '@/hooks/use-toast';
import { useLearningData } from '@/hooks/useLearningData';
import API from '@/components/AxiosInstance';

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { categories } = useLearningData();
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [nickname, setNickname] = useState<string>('학습자님');

  // 추천 수어 상태 추가
  const [recommendedSign, setRecommendedSign] = useState<{
    word: string;
    categoryId: string;
    categoryDescription: string;
  } | null>(null);

  const [recentLearning, setRecentLearning] = useState<{
    category: string;
    word: string;
  } | null>(null);

  useEffect(() => {
    const storedNickname = localStorage.getItem('nickname');
    if (storedNickname) setNickname(storedNickname);


    // 최근 학습 불러오기
    API.get<{category: string; word: string;}>('/api/recent-learning')
      .then(res => {
        if (res.data && res.data.word) {
          setRecentLearning(res.data);
        }
      })
      .catch(() => setRecentLearning(null));

    // 모든 sign을 flat하게 모아서 랜덤 추천
    const allSigns = categories.flatMap(cat =>
      cat.chapters.flatMap(chap => chap.signs.map(sign => ({
        ...sign,
        categoryId: cat.id,
        categoryDescription: cat.description
      })))
    );
    if (allSigns.length > 0) {
      const randomIdx = Math.floor(Math.random() * allSigns.length);
      setRecommendedSign(allSigns[randomIdx]);
    }
  }, [categories]);

  // 실제 데이터를 기반으로 전체 진도율 계산
  const calculateOverallProgress = () => {
    const sampleProgress = [70, 100, 20, 45, 0]; // 각 카테고리별 진도율
    return Math.round(sampleProgress.reduce((sum, progress) => sum + progress, 0) / sampleProgress.length);
  };

  const overallProgress = calculateOverallProgress();


  const handleCardClick = (cardType: string) => {
    switch (cardType) {
      case 'recent':
        navigate('/learn');
        break;
      case 'streak':
        setIsStreakModalOpen(true);
        break;
      case 'badges':
        setIsBadgeModalOpen(true);
        break;
      case 'progress':
        setIsProgressModalOpen(true);
        break;
    }
  };


  const handleLogout = async () => {
    try {
      console.log('🚪 로그아웃 시도...');
      // 백엔드 로그아웃 API 호출 (쿠키 삭제)
      const response = await API.post('auth/logout');
      console.log('✅ 로그아웃 API 성공:', response.data);
    } catch (error) {
      console.error('❌ 로그아웃 API 호출 실패:', error);
      // API 실패해도 프론트엔드에서는 로그아웃 처리
    }
    
    // localStorage 클리어
    localStorage.clear();
    console.log('🧹 localStorage 클리어 완료');
    
    toast({
      title: "로그아웃",
      description: "성공적으로 로그아웃되었습니다.",
    });
    
    setTimeout(() => {
      navigate('/');
    }, 1000);
  };

  const currentTime = new Date().getHours();
  const getGreeting = () => {
    if (currentTime < 12) return '좋은 아침입니다';
    if (currentTime < 18) return '좋은 오후입니다';
    return '좋은 저녁입니다';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/100 backdrop-blur-sm shadow-sm border-b border-blue-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br bg-violet-300 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">🐟</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-violet-600">
                  수어지교
                </span>
                <div className="text-xs text-gray-500 mt-0.5">인터렉티브 수어 학습 플랫폼</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/profile')}
                className="hover:bg-blue-50 transition-colors"
              >
                <User className="h-4 w-4 mr-2" />
                마이페이지
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="hover:bg-red-50 text-red-600 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-violet-600 mb-3">

            {getGreeting()}, {nickname}님! 👋

          </h1>
          <p className="text-gray-600 text-lg">오늘도 수어 학습을 시작해볼까요?</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <Button
            onClick={() => navigate('/search')}
            className="h-28 bg-gradient-to-br from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 flex-col space-y-3 transform hover:scale-105 transition-all duration-300 rounded-2xl shadow-lg"
          >
            <Search className="h-10 w-10" />
            <div>
              <span className="text-xl font-semibold">수어 검색</span>
              <div className="text-blue-100 text-sm mt-1">원하는 수어를 찾아보세요</div>
            </div>
          </Button>

          <Button
            onClick={() => navigate('/learn')}
            variant="outline"
            className="h-28 hover:bg-violet-50 border-2 border-violet-200 hover:border-violet-300 flex-col space-y-3 transform hover:scale-105 transition-all duration-300 rounded-2xl shadow-lg"
          >
            <BookOpen className="h-10 w-10 text-violet-600" />
            <div>
              <span className="text-xl font-semibold text-violet-700">학습하기</span>
              <div className="text-violet-600 text-sm mt-1">새로운 수어를 배워보세요</div>
            </div>
          </Button>

          <Button
            onClick={() => navigate('/review')}
            variant="outline"
            className="h-28 hover:bg-purple-50 border-2 border-purple-200 hover:border-purple-300 flex-col space-y-3 transform hover:scale-105 transition-all duration-300 rounded-2xl shadow-lg"
          >
            <RotateCcw className="h-10 w-10 text-purple-600" />
            <div>
              <span className="text-xl font-semibold text-purple-700">복습하기</span>
              <div className="text-purple-600 text-sm mt-1">학습한 내용을 복습해보세요</div>
            </div>
          </Button>
        </div>

        {/* Dashboard Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* 최근 학습 */}
          <div 
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer group border border-blue-100"

            onClick={() => recentLearning && navigate(`/learn/${encodeURIComponent(recentLearning.word)}`)}

          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">최근 학습</h3>
              <BookOpen className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            {recentLearning ? (
              <>
                <p className="text-sm text-gray-600 mb-2">{recentLearning.category}</p>
                <p className="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{recentLearning.word}</p>
                <div className="mt-4 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  클릭해서 계속 학습하기 →
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-center py-6">최근 학습 기록이 없습니다</p>
            )}
          </div>

          {/* 연속 학습 */}
          <div 
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer group border border-green-100"
            onClick={() => handleCardClick('streak')}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 group-hover:text-green-600 transition-colors">연속 학습</h3>
              <Calendar className="h-6 w-6 text-green-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-sm text-gray-600 mb-2">연속 학습 일수</p>
            <p className="text-3xl font-bold text-green-600 group-hover:animate-pulse">7일 🔥</p>
            <div className="mt-4 text-xs text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">
              달력에서 학습 기록 확인하기 →
            </div>
          </div>

          {/* 획득 뱃지 */}
          <div 
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer group border border-yellow-100"
            onClick={() => handleCardClick('badges')}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 group-hover:text-yellow-600 transition-colors">획득한 뱃지</h3>
              <Trophy className="h-6 w-6 text-yellow-600 group-hover:scale-110 group-hover:rotate-12 transition-all" />
            </div>
            <p className="text-sm text-gray-600 mb-2">총 뱃지 개수</p>
            <p className="text-3xl font-bold text-yellow-600 group-hover:animate-bounce">3개 🏆</p>
            <div className="mt-4 text-xs text-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity">
              새로운 뱃지를 획득해보세요! →
            </div>
          </div>

          {/* 전체 진도율 */}
          <div 
            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer group border border-purple-100"
            onClick={() => handleCardClick('progress')}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">전체 진도율</h3>
              <Target className="h-6 w-6 text-purple-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-sm text-gray-600 mb-2">전체 과정</p>
            <div className="flex items-center space-x-3">
              <p className="text-3xl font-bold text-purple-600">{overallProgress}%</p>
              <div className="flex-1 bg-gray-200 rounded-full h-3 group-hover:bg-purple-100 transition-colors">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-purple-500 h-3 rounded-full group-hover:animate-pulse transition-all duration-500" 
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>
            <div className="mt-4 text-xs text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
              더 많은 과정을 완료해보세요! →
            </div>
          </div>
        </div>

        {/* Enhanced Today's Sentence */}
        <div className="bg-violet-600 rounded-2xl p-8 text-white mb-10 hover:bg-violet-700 transition-all duration-300 transform hover:scale-[1.02] shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-3 flex items-center">
                ✨ 오늘의 추천 수어
              </h3>

              <p className="text-3xl font-bold mb-4">
                {recommendedSign ? `"${recommendedSign.word}"` : '...'}
              </p>
              <p className="text-blue-100 mb-6">
                {recommendedSign?.categoryDescription || '랜덤 추천 수어를 배워보세요'}
              </p>

            </div>
          </div>
          <Button 
            variant="secondary"
            onClick={() => recommendedSign && navigate(`/learn/${encodeURIComponent(recommendedSign.word)}`)}
            className="bg-white/90 hover:bg-white/100 border-white/90 hover:scale-105 transition-all duration-200 backdrop-blur-sm"
            disabled={!recommendedSign}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            지금 배우기
          </Button>
        </div>

        {/* Enhanced Recommended Learning */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <Target className="h-6 w-6 mr-3 text-blue-600" />
            맞춤 추천 학습
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border-2 border-blue-200 rounded-xl p-6 hover:bg-blue-50 hover:border-blue-400 cursor-pointer transition-all duration-200 transform hover:scale-[1.02] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-800 text-lg">일상 인사말</h4>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👋</span>
                </div>
              </div>
              <p className="text-gray-600 mb-4">기본적인 인사 표현을 배워보세요</p>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-blue-600">진도: 70%</span>
                  <div className="w-20 bg-blue-100 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-all">
                  계속하기
                </Button>
              </div>
            </div>
            
            <div className="border-2 border-green-200 rounded-xl p-6 hover:bg-green-50 hover:border-green-400 cursor-pointer transition-all duration-200 transform hover:scale-[1.02] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-800 text-lg">감정 표현</h4>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">😊</span>
                </div>
              </div>
              <p className="text-gray-600 mb-4">다양한 감정을 수어로 표현해보세요</p>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-green-600">완료! ✓</span>
                  <div className="w-20 bg-green-100 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white hover:scale-105 transition-all">
                  복습하기
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <BadgeModal 
        isOpen={isBadgeModalOpen} 
        onClose={() => setIsBadgeModalOpen(false)} 
      />

      <StreakModal 
        isOpen={isStreakModalOpen} 
        onClose={() => setIsStreakModalOpen(false)} 
      />

      <ProgressModal 
        isOpen={isProgressModalOpen} 
        onClose={() => setIsProgressModalOpen(false)} 
      />
    </div>
  );
};

export default Home;