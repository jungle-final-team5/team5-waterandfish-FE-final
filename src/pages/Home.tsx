import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  Search, 
  RotateCcw, 
  Trophy, 
  Calendar,
  Target,
  User,
  LogOut,
  Bell,
  ArrowRight
} from 'lucide-react';
import BadgeModal from '@/components/BadgeModal';
import StreakModal from '@/components/StreakModal';
import ProgressModal from '@/components/ProgressModal';
import HandPreferenceModal from '@/components/HandPreferenceModal';
import OnboardingTour from '@/components/OnboardingTour';
import { NotificationDrawer } from '@/components/NotificationDrawer';
import { useToast } from '@/hooks/use-toast';
import { useLearningData } from '@/hooks/useLearningData';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationHistory } from '@/hooks/useNotificationHistory';
import { useOnboarding } from '@/hooks/useOnboarding';
import API from '@/components/AxiosInstance';
import { useStreakData } from "@/hooks/useStreakData";
import { useBadgeSystem } from '@/hooks/useBadgeSystem';
import { useAuth } from '@/hooks/useAuth';
import debounce from 'lodash.debounce';

// 최근 학습 정보 타입
interface RecentLearning {
  category: string | null;
  chapter: string | null;
}

// 진도율 정보 타입
interface ProgressOverview {
  overall_progress: number;
  total_lessons: number;
  completed_chapters: number;
  total_chapters: number;
  categories: Array<{
    id: string;
    name: string;
    description: string;
    progress: number;
    completed_lessons: number;
    total_lessons: number;
    status: string;
  }>;
}

interface RecommendedSign {
  word: string;
  description?: string;
  videoUrl?: string;
  category?: {
    id: string;
    name: string;
  };
  [key: string]: unknown;
}

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { categories, categoriesLoading } = useLearningData();
  const { showStreakAchievement } = useNotifications();
  const { unreadCount } = useNotificationHistory();
  const { checkBadges } = useBadgeSystem();
    const { isOnboardingActive, currentStep, nextStep, previousStep, skipOnboarding, completeOnboarding } = useOnboarding();
  const { currentStreak } = useStreakData();
  const { logout } = useAuth();
  
  // 검색 기능
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // 샘플 검색 데이터 (실제 데이터로 대체 가능)
  const sampleSearchData = [
    '안녕하세요', '감사합니다', '사랑해요', '미안해요', '괜찮아요',
    '좋아해요', '싫어해요', '네/예', '아니요', '도와주세요',
    '물', '밥', '집', '학교', '병원', '가족', '친구', '선생님'
  ];
  
  // 진도율 상태 추가
  const [progressOverview, setProgressOverview] = useState<ProgressOverview | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);

  // 추천 수어 상태 추가
  const [recommendedSign, setRecommendedSign] = useState<RecommendedSign | null>(null);
  const [recentLearning, setRecentLearning] = useState<RecentLearning | null>(null);
  const [nickname, setNickname] = useState<string>('학습자');

  // 뱃지 개수 상태 추가
  const [badgeCount, setBadgeCount] = useState<number>(0);

  // 첫 방문 확인 및 손 선호도 모달 표시
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isHandPreferenceModalOpen, setIsHandPreferenceModalOpen] = useState(false);

  // 온보딩
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  useEffect(() => {
    const hasSetHandPreference = localStorage.getItem('hasSetHandPreference');
    if (!hasSetHandPreference) {
      setIsHandPreferenceModalOpen(true);
    }
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setShouldShowOnboarding(user.handedness === null || user.handedness === undefined || user.handedness === "");
      } catch {
        setShouldShowOnboarding(false);
      }
        } else {
      setShouldShowOnboarding(false);
        }
  }, [isOnboardingActive]);

  // 진도율 데이터 가져오기
  useEffect(() => {
    const fetchProgressOverview = async () => {
      try {
        setProgressLoading(true);
        const response = await API.get<{ success: boolean; data: ProgressOverview; message: string }>('/progress/overview');
        setProgressOverview(response.data.data);
      } catch (error) {
        setProgressOverview(null);
      } finally {
        setProgressLoading(false);
      }
    };
    fetchProgressOverview();
  }, []);

  // 추천 수어 가져오기
  useEffect(() => {
    const fetchDailySign = async () => {
      try {
        const res = await API.get<{ success: boolean; data: { lessons: RecommendedSign[] } }>(
          '/recommendations/daily-sign'
        );
        if (res.data.success && res.data.data && Array.isArray(res.data.data.lessons) && res.data.data.lessons.length > 0) {
          setRecommendedSign(res.data.data.lessons[0]);
        } else {
          setRecommendedSign(null);
        }
      } catch (e) {
        setRecommendedSign(null);
      }
    };
    fetchDailySign();
  }, []);

  // 최근 학습 정보 가져오기
  useEffect(() => {
    const storedNickname = localStorage.getItem('nickname');
    if (storedNickname) setNickname(storedNickname);
    API.get<{ success: boolean; data: RecentLearning; message: string }>('/progress/recent-learning')
      .then(res => {
        if (res.data.data && res.data.data.category && res.data.data.chapter) {
          setRecentLearning(res.data.data);
        } else {
          setRecentLearning(null);
  }
      })
      .catch(() => setRecentLearning(null));
  }, []);

  // 뱃지 개수 불러오기
  useEffect(() => {
    const fetchBadgeCount = async () => {
      try {
        const res = await API.get('/badge/earned');
        setBadgeCount(Array.isArray(res.data) ? res.data.length : 0);
      } catch (e) {
        setBadgeCount(0);
      }
    };
    fetchBadgeCount();
  }, []);

  // 검색 디바운스 및 API 연동
  const debouncedFetch = useRef(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }
      setSearchLoading(true);
      try {
        const { data } = await API.get<{ data: { lessons: { word: string }[] } }>('/search', { params: { q: query, k: 5 } });
        if (Array.isArray(data?.data?.lessons)) {
          setSearchResults(data.data.lessons.map((item) => item.word));
        } else {
          setSearchResults([]);
        }
        setShowResults(true);
      } catch {
        setSearchResults([]);
        setShowResults(false);
      } finally {
        setSearchLoading(false);
  }
    }, 300)
  ).current;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    debouncedFetch(query);
  };

  const handleSearchSelect = (selectedItem: string) => {
    setSearchQuery(selectedItem);
    setShowResults(false);
    navigate(`/learn/word/${encodeURIComponent(selectedItem)}`);
  };

  const handleCardClick = (cardType: string) => {
    switch (cardType) {
      case 'recent':
        if (recentLearning && recentLearning.chapter) {
          navigate(`/learn/chapter/${encodeURIComponent(recentLearning.chapter)}/guide`);
        } else {
        navigate('/category');
        }
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
      await API.post('auth/logout');
    } catch (error) {
      // 에러 무시: 로그아웃 실패 시에도 프론트엔드에서 로그아웃 처리
    }
    logout();
    localStorage.clear();
    toast({
      title: "로그아웃",
      description: "성공적으로 로그아웃되었습니다.",
    });
    navigate('/');
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
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-blue-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">🐟</span>
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  수어지교
                </span>
                <div className="text-xs text-gray-500 mt-0.5">인터렉티브 수어 학습 플랫폼</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <NotificationDrawer>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="hover:bg-blue-50 transition-colors relative"
                  data-tour="notification-button"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  알림
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </NotificationDrawer>
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
      <main className="container mx-auto px-4 py-4">
        {/* Welcome Section with Search */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            {getGreeting()}, {nickname}님! 👋
          </h1>
          <p className="text-gray-600 mb-4">오늘도 수어 학습을 시작해볼까요?</p>

          {/* Central Search Bar */}
          <div className="w-full max-w-2xl mx-auto mb-4 relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="배우고 싶은 수어를 검색해보세요 (예: 안녕하세요, 감사합니다)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl h-14"
                data-tour="search-button"
              />
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchSelect(result)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 first:rounded-t-xl last:rounded-b-xl transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">{result}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Button
            onClick={() => navigate('/category')}
            variant="outline"
            className="h-20 hover:bg-green-50 border-2 border-green-200 hover:border-green-300 flex items-center justify-center space-x-3 transform hover:scale-105 transition-all duration-300 rounded-xl shadow-sm"
            data-tour="learn-button"
          >
            <BookOpen className="h-8 w-8 text-green-600" />
            <div>
              <span className="text-lg font-semibold text-green-700">학습하기</span>
              <div className="text-green-600 text-sm">새로운 수어를 배워보세요</div>
            </div>
          </Button>

          <Button
            onClick={() => navigate('/review')}
            variant="outline"
            className="h-20 hover:bg-purple-50 border-2 border-purple-200 hover:border-purple-300 flex items-center justify-center space-x-3 transform hover:scale-105 transition-all duration-300 rounded-xl shadow-sm"
            data-tour="review-button"
          >
            <RotateCcw className="h-8 w-8 text-purple-600" />
            <div>
              <span className="text-lg font-semibold text-purple-700">복습하기</span>
              <div className="text-purple-600 text-sm">학습한 내용을 복습해보세요</div>
            </div>
          </Button>
        </div>

        {/* Dashboard Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6" data-tour="dashboard-cards">
          {/* 최근 학습 */}
          <div 
            className="bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-300 cursor-pointer group border border-blue-100"
            onClick={() => handleCardClick('recent')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-800 text-sm group-hover:text-blue-600 transition-colors">최근 학습</h3>
              <BookOpen className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            {recentLearning && recentLearning.category && recentLearning.chapter ? (
              <>
                <p className="text-xs text-gray-600 mb-1">{recentLearning.category}</p>
                <p className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{recentLearning.chapter}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-600 mb-1">최근 학습 기록이 없습니다</p>
                <p className="text-lg font-bold text-gray-400">-</p>
              </>
            )}
          </div>

          {/* 연속 학습 */}
          <div 
            className="bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-300 cursor-pointer group border border-green-100"
            onClick={() => handleCardClick('streak')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-800 text-sm group-hover:text-green-600 transition-colors">연속 학습</h3>
              <Calendar className="h-4 w-4 text-green-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-xs text-gray-600 mb-1">연속 학습 일수</p>
            <p className="text-lg font-bold text-green-600 group-hover:animate-pulse">{currentStreak}일 🔥</p>
          </div>

          {/* 획득 뱃지 */}
          <div 
            className="bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-300 cursor-pointer group border border-yellow-100"
            onClick={() => handleCardClick('badges')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-800 text-sm group-hover:text-yellow-600 transition-colors">획득한 뱃지</h3>
              <Trophy className="h-4 w-4 text-yellow-600 group-hover:scale-110 group-hover:rotate-12 transition-all" />
            </div>
            <p className="text-xs text-gray-600 mb-1">총 뱃지 개수</p>
            <p className="text-lg font-bold text-yellow-600 group-hover:animate-bounce">{badgeCount}개 🏆</p>
          </div>

          {/* 전체 진도율 */}
          <div 
            className="bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-300 cursor-pointer group border border-purple-100"
            onClick={() => handleCardClick('progress')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-800 text-sm group-hover:text-purple-600 transition-colors">전체 진도율</h3>
              <Target className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-xs text-gray-600 mb-1">전체 과정</p>
            {progressLoading ? (
              <div className="flex items-center space-x-2">
                <div className="text-lg font-bold text-purple-600 animate-pulse">...</div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{ width: '50%' }}></div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <p className="text-lg font-bold text-purple-600">{progressOverview?.overall_progress || 0}%</p>
                <div className="flex-1 bg-gray-200 rounded-full h-2 group-hover:bg-purple-100 transition-colors">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-purple-500 h-2 rounded-full group-hover:animate-pulse transition-all duration-500"
                    style={{ width: `${progressOverview?.overall_progress || 0}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compact Today's Sentence & Recommended Learning */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Compact Today's Sentence */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">✨ 오늘의 추천 수어</h3>
              <div className="text-2xl opacity-30">🤟</div>
            </div>
            <p className="text-xl font-bold mb-2">{recommendedSign ? `"${String(recommendedSign.word)}"` : '...'}</p>
            <p className="text-blue-100 text-sm mb-3">
                {recommendedSign && recommendedSign.category && typeof recommendedSign.category === 'object' && recommendedSign.category !== null && 'name' in recommendedSign.category
                  ? String((recommendedSign.category as { name?: unknown }).name ?? '랜덤 추천 수어를 배워보세요')
                  : '랜덤 추천 수어를 배워보세요'}
              </p>
          <Button 
              size="sm"
            variant="secondary"
            onClick={() => {
              if (recommendedSign && recommendedSign.id) {
                navigate(`/learn/${recommendedSign.id}`);
              } else if (recommendedSign && recommendedSign.word) {
                navigate(`/learn/word/${encodeURIComponent(recommendedSign.word)}`);
              } else {
                alert('추천 수어 정보가 없습니다.');
              }
            }}
              className="bg-white/20 hover:bg-white/30 border-white/30 backdrop-blur-sm"
            disabled={!recommendedSign}
          >
              <BookOpen className="h-3 w-3 mr-2" />
            지금 배우기
          </Button>
        </div>

          {/* Compact Recommended Learning */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <Target className="h-4 w-4 mr-2 text-blue-600" />
            맞춤 추천 학습
          </h3>
            <div className="space-y-3">
              {(progressOverview?.categories ?? []).slice(0, 2).map((category, index) => (
                <div 
                  key={category.id}
                  className={`border rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition-all ${
                    category.status === 'completed' 
                      ? 'border-green-200 hover:bg-green-50 hover:border-green-400' 
                      : 'border-blue-200 hover:bg-blue-100 hover:border-blue-400'
                  }`}
                  onClick={() => navigate(`/learn/word/${encodeURIComponent(category.name)}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      category.status === 'completed' ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                        <span className="text-lg">{category.status === 'completed' ? '✅' : '📚'}</span>
                    </div>
                      <div>
                        <h4 className="font-medium text-gray-800 text-sm">{category.name}</h4>
                    <div className="flex items-center space-x-2">
                          <span className={`text-xs ${
                        category.status === 'completed' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                            {category.status === 'completed' ? '완료 ✓' : `진도: ${category.progress}%`}
                      </span>
                          <div className={`w-16 rounded-full h-1.5 ${
                        category.status === 'completed' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <div 
                              className={`h-1.5 rounded-full ${
                            category.status === 'completed' ? 'bg-green-600' : 'bg-blue-600'
                          }`} 
                          style={{ width: `${category.progress}%` }}
                        ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className={`text-xs px-2 py-1 ${
                        category.status === 'completed' 
                          ? 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      } hover:scale-105 transition-all`}
                      variant={category.status === 'completed' ? 'outline' : 'default'}
                    >
                      {category.status === 'completed' ? '복습' : '계속'}
                    </Button>
                  </div>
                </div>
              ))}
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

      <HandPreferenceModal 
        isOpen={isHandPreferenceModalOpen} 
        onClose={() => setIsHandPreferenceModalOpen(false)} 
      />

      {/* 온보딩 투어 */}
      {isOnboardingActive && shouldShowOnboarding && (
        <OnboardingTour
          currentStep={currentStep}
          onNext={nextStep}
          onSkip={skipOnboarding}
          onComplete={completeOnboarding}
          onPrevious={previousStep}
        />
      )}
    </div>
  );
};

export default Home;