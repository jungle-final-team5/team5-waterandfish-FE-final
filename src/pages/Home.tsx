// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.

import React, { useState, useEffect, useRef } from 'react';
import { Card, Progress, Badge, Avatar, Tooltip, Input } from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  SearchOutlined,
  PlayCircleOutlined,
  TrophyOutlined,
  CalendarOutlined,
  BookOutlined,
  HomeOutlined,
  QuestionCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge as CustomBadge } from '@/components/ui/badge';
import { Input as CustomInput } from '@/components/ui/input';
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
  ArrowRight,
  Medal,
  Award,
  Star,
  Zap,
  Heart,
  Crown,
  Flame,
  Shield,
  Book,
  Play
} from 'lucide-react';
import BadgeModal from '@/components/BadgeModal';
import StreakModal from '@/components/StreakModal';
import ProgressModal from '@/components/ProgressModal';
import { useToast } from '@/hooks/use-toast';
import { useLearningData } from '@/hooks/useLearningData';
import { useBadgeSystem } from '@/hooks/useBadgeSystem';
import { useStreakData } from '@/hooks/useStreakData';
import API from '@/components/AxiosInstance';
import debounce from 'lodash.debounce';
import HandPreferenceModal from '@/components/HandPreferenceModal';
import OnboardingTour from '@/components/OnboardingTour';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuth } from '@/hooks/useAuth';
import useWebsocket, { connectToWebSockets, disconnectWebSockets } from '@/hooks/useWebsocket';
import { Lesson } from '@/types/learning';
import { useGlobalWebSocketStatus } from '@/contexts/GlobalWebSocketContext';
import { useChapterHandler } from '@/hooks/useChapterHandler';


const { Search: AntdSearch } = Input;

// 최근 학습 정보 타입
interface RecentLearning {
  category: string | null;
  chapter: string | null;
  chapterId?: string; // 추가
  modeNum?: string; // 추가
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

// 뱃지 타입 정의
interface BadgeData {
  id: number;
  name: string;
  icon: string;
  unlocked: boolean;
}

interface ApiBadge {
  id: number;
  name: string;
  icon_url: string;
}

interface EarnedBadge {
  badge_id: number;
  id?: number; // 일부 API는 id로 반환할 수 있음
}

// BadgeModal.tsx 참고: 아이콘 매핑 함수 추가
const getIconForBadge = (iconName: string | undefined) => {
  const iconMap: Record<string, React.ReactNode> = {
    'trophy': <Trophy className="w-7 h-7 text-yellow-600" />,
    'calendar': <Calendar className="w-7 h-7 text-green-600" />,
    'target': <Target className="w-7 h-7 text-blue-600" />,
    'medal': <Medal className="w-7 h-7 text-purple-600" />,
    'award': <Award className="w-7 h-7 text-red-600" />,
    'star': <Star className="w-7 h-7 text-orange-600" />,
    'zap': <Zap className="w-7 h-7 text-yellow-500" />,
    'book': <Book className="w-7 h-7 text-indigo-600" />,
    'heart': <Heart className="w-7 h-7 text-pink-600" />,
    'crown': <Crown className="w-7 h-7 text-amber-600" />,
    'flame': <Flame className="w-7 h-7 text-red-500" />,
    'shield': <Shield className="w-7 h-7 text-teal-600" />
  };
  if (!iconName) return <Trophy className="w-7 h-7 text-gray-600" />;
  return iconMap[iconName.toLowerCase()] || <Trophy className="w-7 h-7 text-gray-600" />;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkBadges } = useBadgeSystem();
  const { currentStreak, studyDates, loading: streakLoading } = useStreakData();
  const { isOnboardingActive, currentStep, nextStep, previousStep, skipOnboarding, completeOnboarding } = useOnboarding();
  const { logout } = useAuth();
  const { categories, findChapterById } = useLearningData();
  const { showStatus } = useGlobalWebSocketStatus();
  // 검색 기능
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // 진도율 상태
  const [progressOverview, setProgressOverview] = useState<ProgressOverview | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);

  // 추천 수어 상태
  const [recommendedSign, setRecommendedSign] = useState<RecommendedSign | null>(null);
  const [recentLearning, setRecentLearning] = useState<RecentLearning | null>(null);
  const [nickname, setNickname] = useState<string>('학습자');
  const [badgeCount, setBadgeCount] = useState<number>(0);
  const [badgeList, setBadgeList] = useState<BadgeData[]>([]);

  // 모달 상태
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  // 온보딩 및 손 선호도 모달 상태
  const [isHandPreferenceModalOpen, setIsHandPreferenceModalOpen] = useState(false);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);

  // 전체 진도율 원형 그래프 변수 선언 (JSX 바깥에서)
  const percent = progressOverview?.overall_progress || 0;
  const radius = 56;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const progress = Math.max(0, Math.min(percent, 100));
  const offset = circumference - (progress / 100) * circumference;

  // 시간대별 인사 메시지
  const getGreeting = () => {
    const currentTime = new Date().getHours();
    if (currentTime < 12) return '좋은 아침입니다';
    if (currentTime < 18) return '좋은 오후입니다';
    return '좋은 저녁입니다';
  };

  // 데이터 패칭
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

  useEffect(() => {
    const fetchDailySign = async () => {
      try {
        const res = await API.get<{ success: boolean; data: { lessons: RecommendedSign[] } }>('/recommendations/daily-sign');
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

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        // 전체 뱃지 목록
        const allBadgesRes = await API.get<ApiBadge[]>('/badge/');
        // 획득한 뱃지 목록
        const earnedBadgesRes = await API.get<EarnedBadge[]>('/badge/earned');
        const earnedIds = Array.isArray(earnedBadgesRes.data)
          ? earnedBadgesRes.data.map((b) => b.badge_id ?? b.id)
          : [];
        // unlocked 필드 추가
        const processed = Array.isArray(allBadgesRes.data)
          ? allBadgesRes.data.map((badge) => ({
            id: badge.id,
            name: badge.name,
            icon: badge.icon_url,
            unlocked: earnedIds.includes(badge.id),
          }))
          : [];
        setBadgeList(processed);
        setBadgeCount(processed.filter(b => b.unlocked).length);
      } catch (e) {
        setBadgeList([]);
        setBadgeCount(0);
      }
    };
    fetchBadges();
  }, []);

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
        const { data } = await API.get<{ data: { lessons: RecommendedSign[] } }>('/search', { params: { q: query, k: 5 } });
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

  const { connectingChapter, handleStartLearn, handleStartQuiz } = useChapterHandler();

  const handleCardClick = (cardType: string) => {
    switch (cardType) {
      case 'recent':
        // 최근학습 정보에 chapterId, modeNum이 있으면 해당 경로로 이동
        if (recentLearning) {
          const modeNum = recentLearning.modeNum;
          const lessonIds = (findChapterById(recentLearning.chapterId)?.lessons || []).map((lesson: Lesson) => lesson.id);
          if (modeNum == '1') {
            handleStartLearn(recentLearning.chapterId, lessonIds);
          } else if (recentLearning.modeNum == '2') {
            handleStartQuiz(recentLearning.chapterId, lessonIds);
          }
          else {
            alert(`유효하지 않은 최근학습입니다`);
          }
        } else {
          // fallback: 카테고리 페이지로 이동
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

  // 로그아웃 핸들러 보강
  const handleLogout = async () => {
    try {
      await API.post('auth/logout');
    } catch (error) { }
    if (logout) logout();
    localStorage.clear();
    toast({ title: "로그아웃", description: "성공적으로 로그아웃되었습니다." });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100">
      <style>
        {`
          .!rounded-button {
            border-radius: 12px !important;
          }
          body {
            min-height: 1024px;
          }
        `}
      </style>

      {/* 상단 로고 및 버튼만 남기고 인사 메시지는 제거 */}
      <div className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* 로고 영역 */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-violet-200 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">🐟</span>
            </div>
            <div>
              <span className="text-2xl font-bold bg-violet-600 bg-clip-text text-transparent">
                수어지교
              </span>
              <div className="text-xs text-gray-500 mt-0.5">인터렉티브 수어 학습 플랫폼</div>
            </div>
          </div>
          {/* 프로필/설정 버튼 - 알림(벨) 아이콘 제거 */}
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            {/* 알림 버튼 제거됨 */}
            <Button onClick={() => navigate('/profile')} variant="ghost" size="icon">
              <User className="h-5 w-5 text-gray-600" />
            </Button>
            <Button onClick={handleLogout} variant="ghost" size="icon" aria-label="logout">
              <LogOut className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        </div>
      </div>

      {/* 인사 메시지: 중앙 검색창 바로 위 */}
      <div className="w-full max-w-2xl mx-auto mt-8 mb-2 text-center">
        <h1 className="text-3xl font-bold text-violet-600 mb-2">
          {getGreeting()}, {nickname}님! 👋
        </h1>
        <p className="text-gray-600 mb-2">오늘도 수어 학습을 시작해볼까요?</p>
      </div>

      {/* 중앙 검색 바 (Home.tsx 스타일) */}
      <div className="w-full max-w-2xl mx-auto mt-8 mb-8 relative transition-all duration-200 rounded-xl bg-white">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <CustomInput
            type="text"
            placeholder="배우고 싶은 수어를 검색해보세요 (예: 병원, 학교)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            className="w-full pl-12 pr-4 py-4 text-lg border-2 !border-gray-200 focus:!border-transparent focus:ring-2 focus:ring-blue-400 rounded-xl h-14 transition-all"
          />
        </div>
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-[9999]">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => handleSearchSelect(result)}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 first:rounded-t-xl last:rounded-b-xl transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-indigo-800">{result}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* 최근 학습 + 오늘의 추천 수어 (나란히 배치) */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* 최근 학습 카드 */}
              <div className="flex-1 bg-indigo-500 rounded-lg p-6 text-white shadow-lg min-h-[240px] flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-blue-200 cursor-pointer">
                <div>
                  <h2 className="text-xl font-bold flex items-center mb-2">
                    <BookOpen className="mr-2 text-blue-100" />최근 학습
                  </h2>
                  {recentLearning && recentLearning.category && recentLearning.chapter ? (
                    <>
                      <div className="text-3xl font-semibold mb-1">{recentLearning.category}</div>
                      <div className="text-lg mb-4">{recentLearning.chapter}</div>
                    </>
                  ) : (
                    <div className="text-base mb-4 text-blue-100">최근 학습 기록이 없습니다.</div>
                  )}
                </div>

                <Button
                  className="bg-white text-indigo-500 px-6 py-2 rounded-xl font-semibold hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap mt-2"
                  onClick={() => {
                    handleCardClick('recent')
                  }}
                >
                  {connectingChapter === recentLearning?.chapterId ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      연결 중...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      이어서 학습하기
                    </>
                  )}
                </Button>


              </div>

              {/* 오늘의 추천 수어 카드 */}
              <div className="flex-1 bg-violet-600 rounded-lg p-6 text-white shadow-lg min-h-[240px] flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-violet-300 cursor-pointer">
                <div>
                  <h2 className="text-xl font-bold flex items-center mb-2">
                    <Calendar className="mr-2 text-purple-100" />오늘의 추천 수어
                  </h2>
                  <h3 className="text-3xl font-semibold mb-3">{recommendedSign ? recommendedSign.word : '...'}</h3>
                  <p className="text-purple-100 mb-4 text-lg">{recommendedSign?.description || '수어지교에서 추천하는 수어를 배워보세요'}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <Button
                    className="w-full bg-white text-violet-600 py-3 text-base rounded-xl font-semibold hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                    onClick={() => {
                      if (recommendedSign && recommendedSign.id) {
                        navigate(`/learn/${recommendedSign.id}`);
                      } else if (recommendedSign && recommendedSign.word) {
                        navigate(`/learn/word/${encodeURIComponent(recommendedSign.word)}`);
                      }
                    }}
                  >
                    지금 배우기
                  </Button>
                </div>
              </div>
            </div>

            {/* 맞춤 추천 학습 */}
            <div className="bg-white rounded-lg p-8 shadow-lg min-h-[220px]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">맞춤 추천 학습</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(progressOverview?.categories ?? [])
                  .filter(category => category.status !== 'completed')
                  .sort((a, b) => b.progress - a.progress)
                  .slice(0, 3)
                  .map((category) => (
                    <div key={category.id} className="bg-violet-50 rounded-lg p-6 shadow-lg min-h-[140px] flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-violet-300 hover:bg-violet-100 cursor-pointer"
                      onClick={() => navigate(`/category/${category.id}/chapters`)}
                    >
                      <h3 className="font-semibold text-gray-800 mb-2 text-lg">{category.name}</h3>
                      <div className="flex items-center justify-between mt-auto">
                        <CustomBadge variant="default" className="text-sm px-2 py-1 text-violet-600 bg-violet-100 hover:bg-violet-200">
                          {`진도: ${category.progress}%`}
                        </CustomBadge>
                        <Button className="bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 cursor-pointer whitespace-nowrap px-3 py-1.5" size="sm">
                          계속
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {/* Learning Streak */}
            <Card className="shadow-lg !rounded-button mb-6 cursor-pointer min-h-[240px] z-0 transition-all duration-200 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-green-400 hover:bg-green-50" onClick={() => setIsStreakModalOpen(true)}>
              <div className="text-center">
                <div className="text-2xl mb-2">🔥</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">연속 학습</h3>
                {streakLoading ? (
                  <div className="text-gray-400 text-lg mb-1 animate-pulse">로딩 중...</div>
                ) : (
                  <div className="text-3xl font-bold text-green-500 mb-1">{currentStreak}일</div>
                )}
                <p className="text-gray-600 text-sm mb-2">연속 학습 중!</p>
                <div className="mt-3 flex justify-center space-x-2">
                  {(() => {
                    const getLast7Days = () => {
                      const days = [];
                      const today = new Date();
                      for (let i = 6; i >= 0; i--) {
                        const d = new Date(today);
                        d.setDate(today.getDate() - i);
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        days.push(`${y}-${m}-${day}`);
                      }
                      return days;
                    };
                    const last7Days = getLast7Days();
                    return last7Days.map((date, i) => (
                      <div
                        key={i}
                        className={`w-5 h-5 rounded-full ${studyDates && studyDates.includes(date) ? 'bg-green-500' : 'bg-gray-200'}`}
                      />
                    ));
                  })()}
                </div>
                <p className="text-xs text-gray-500 mt-1">최근 7일</p>
              </div>
            </Card>
            {/* 전체 진도율 + 뱃지 카드 나란히 배치 */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* Overall Progress */}
              <Card className="shadow-lg !rounded-button flex-1 mb-0 cursor-pointer min-h-[150px] transition-all duration-200 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-blue-200 hover:bg-blue-50" onClick={() => setIsProgressModalOpen(true)}>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center justify-center">
                    <Target className="mr-2 text-blue-500" />
                    전체 진도율
                  </h3>
                  <div className="relative inline-block" style={{ width: radius * 2, height: radius * 2 }}>
                    <svg
                      width={radius * 2}
                      height={radius * 2}
                      className="block mx-auto"
                      style={{ transform: 'rotate(-90deg)' }}
                    >
                      {/* 배경 원 */}
                      <circle
                        cx={radius}
                        cy={radius}
                        r={normalizedRadius}
                        fill="none"
                        stroke="#E5E7EB"
                        strokeWidth={stroke}
                      />
                      {/* 진행 원 */}
                      <circle
                        cx={radius}
                        cy={radius}
                        r={normalizedRadius}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth={stroke}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.6s' }}
                      />
                    </svg>
                    {/* 중앙 숫자 */}
                    <span className="absolute top-1/2 left-1/2 text-3xl font-bold text-blue-600" style={{ transform: 'translate(-50%, -50%)' }}>
                      {percent}%
                    </span>
                  </div>
                  {/* 완료 챕터 중앙 정렬 */}
                  <div className="mt-4 flex flex-col items-center justify-center text-sm">
                    <div className="font-semibold text-gray-800">완료 챕터</div>
                    <div className="text-blue-600 font-bold">{progressOverview?.completed_chapters || 0}/{progressOverview?.total_chapters || 0}</div>
                  </div>
                </div>
              </Card>
              {/* Badges */}
              <Card className="shadow-lg !rounded-button flex-1 mb-0 cursor-pointer min-h-[150px] transition-all duration-200 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-yellow-200 hover:bg-yellow-50" onClick={() => setIsBadgeModalOpen(true)}>
                <div className="mb-2">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <Trophy className="mr-2 text-yellow-500" />
                    획득한 뱃지
                  </h3>
                </div>
                <div className="flex flex-col gap-2">
                  {badgeList.filter(badge => badge.unlocked).length === 0 ? (
                    <div className="text-center text-gray-400 py-3">획득한 뱃지가 없습니다.</div>
                  ) : (
                    badgeList.filter(badge => badge.unlocked).slice(-3).reverse().map((badge) => (
                      <div
                        key={badge.id}
                        className="flex items-center p-2 rounded-lg transition-all bg-yellow-50 border-2 border-yellow-200 mb-1"
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="flex-shrink-0 flex justify-center items-center mr-2">
                          {getIconForBadge(badge.icon)}
                        </div>
                        <div className="flex flex-col">
                          <p className="text-xs text-gray-800 font-semibold">
                            {badge.name.length > 8 ? badge.name.slice(0, 8) + '...' : badge.name}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-indigo-700 px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center space-x-12">
            <div className="flex flex-col items-center cursor-pointer text-white">
              <HomeOutlined className="text-2xl mb-1" />
              <span className="text-xs font-medium">홈</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors"
              onClick={() => navigate('/category')}>
              <BookOutlined className="text-2xl mb-1" />
              <span className="text-xs font-medium">학습</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors"
              onClick={() => navigate('/review')}>
              <ReloadOutlined className="text-2xl mb-1" />
              <span className="text-xs font-medium">복습</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom padding to account for fixed navigation */}
      <div className="h-20"></div>

      {/* 모달 */}
      <BadgeModal isOpen={isBadgeModalOpen} onClose={() => setIsBadgeModalOpen(false)} />
      <StreakModal isOpen={isStreakModalOpen} onClose={() => setIsStreakModalOpen(false)} />
      <ProgressModal isOpen={isProgressModalOpen} onClose={() => setIsProgressModalOpen(false)} />
      <HandPreferenceModal isOpen={isHandPreferenceModalOpen} onClose={() => setIsHandPreferenceModalOpen(false)} />
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

export default Dashboard; 