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
  ArrowRight
} from 'lucide-react';
import BadgeModal from '@/components/BadgeModal';
import StreakModal from '@/components/StreakModal';
import ProgressModal from '@/components/ProgressModal';
import { useToast } from '@/hooks/use-toast';
import { useLearningData } from '@/hooks/useLearningData';
import { useNotificationHistory } from '@/hooks/useNotificationHistory';
import { useBadgeSystem } from '@/hooks/useBadgeSystem';
import { useStreakData } from '@/hooks/useStreakData';
import API from '@/components/AxiosInstance';
import debounce from 'lodash.debounce';

const { Search: AntdSearch } = Input;

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

// 뱃지 타입 정의
interface BadgeData {
  id: number;
  name: string;
  icon: string;
  unlocked: boolean;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { unreadCount } = useNotificationHistory();
  const { checkBadges } = useBadgeSystem();
  const { currentStreak } = useStreakData();

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
    const fetchBadgeCount = async () => {
      try {
        const res = await API.get<{ success: boolean; data: BadgeData[]; message: string }>('/badge/earned');
        setBadgeCount(Array.isArray(res.data.data) ? res.data.data.length : 0);
        setBadgeList(Array.isArray(res.data.data) ? res.data.data : []);
      } catch (e) {
        setBadgeCount(0);
        setBadgeList([]);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
          {/* 프로필/설정 버튼 */}
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <Button onClick={() => navigate('/profile')} variant="ghost" size="icon">
              <User className="h-5 w-5 text-gray-600" />
            </Button>
            <Button onClick={() => navigate('/settings')} variant="ghost" size="icon">
              <LogOut className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        </div>
      </div>

      {/* 인사 메시지: 중앙 검색창 바로 위 */}
      <div className="w-full max-w-2xl mx-auto mt-8 mb-2 text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          {getGreeting()}, {nickname}님! 👋
        </h1>
        <p className="text-gray-600 mb-2">오늘도 수어 학습을 시작해볼까요?</p>
      </div>

      {/* 중앙 검색 바 (Home.tsx 스타일) */}
      <div className="w-full max-w-2xl mx-auto mt-8 mb-8 relative transition-all duration-200 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-blue-200 rounded-xl bg-white">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <CustomInput
            type="text"
            placeholder="배우고 싶은 수어를 검색해보세요 (예: 안녕하세요, 감사합니다)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl h-14"
          />
        </div>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 최근 학습 + 오늘의 추천 수어 (나란히 배치) */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* 최근 학습 카드 */}
              <div className="flex-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg p-6 text-white shadow-lg min-h-[240px] flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-blue-200 cursor-pointer">
                <div>
                  <h2 className="text-xl font-bold flex items-center mb-2">
                    <BookOpen className="mr-2 text-blue-100" />최근 학습
                  </h2>
                  {recentLearning && recentLearning.category && recentLearning.chapter ? (
                    <>
                      <div className="text-lg font-semibold mb-1">{recentLearning.category}</div>
                      <div className="text-base mb-4">{recentLearning.chapter}</div>
                    </>
                  ) : (
                    <div className="text-base mb-4 text-blue-100">최근 학습 기록이 없습니다.</div>
                  )}
                </div>
                <Button
                  className="bg-white text-blue-600 px-6 py-2 rounded-xl font-semibold hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap mt-2"
                  onClick={() => handleCardClick('recent')}
                >
                  이어서 학습하기
                </Button>
              </div>

              {/* 오늘의 추천 수어 카드 */}
              <div className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white shadow-lg min-h-[240px] flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-purple-300 cursor-pointer">
                <div>
                  <h2 className="text-xl font-bold flex items-center mb-2">
                    <BookOpen className="mr-2 text-blue-100" />오늘의 추천 수어
                  </h2>
                  <h3 className="text-lg font-semibold mb-2">{recommendedSign ? recommendedSign.word : '...'}</h3>
                  <p className="text-blue-100 mb-4">{recommendedSign?.description || '수어지교에서 추천하는 오늘의 수어를 배워보세요'}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <Button
                    className="w-full bg-white text-blue-600 py-3 text-base rounded-xl font-semibold hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
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
                {(progressOverview?.categories ?? []).slice(0, 3).map((category) => (
                  <div key={category.id} className="bg-gray-50 rounded-lg p-6 shadow-lg min-h-[140px] flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-blue-200 cursor-pointer"
                    onClick={() => navigate(`/learn/word/${encodeURIComponent(category.name)}`)}
                  >
                    <h3 className="font-semibold text-gray-800 mb-2 text-lg">{category.name}</h3>
                    <div className="flex items-center justify-between mt-auto">
                      <CustomBadge variant={category.status === 'completed' ? 'secondary' : 'default'} className="text-sm px-2 py-1">
                        {category.status === 'completed' ? '완료' : `진도: ${category.progress}%`}
                      </CustomBadge>
                      <Button className="text-white text-sm font-medium hover:text-blue-800 cursor-pointer whitespace-nowrap px-3 py-1.5" size="sm">
                        {category.status === 'completed' ? '복습' : '계속'}
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
            <Card className="shadow-lg !rounded-button mb-6 cursor-pointer min-h-[240px] transition-all duration-200 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-orange-200" onClick={() => setIsStreakModalOpen(true)}>
              <div className="text-center">
                <div className="text-2xl mb-2">🔥</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">연속 학습</h3>
                <div className="text-3xl font-bold text-orange-500 mb-1">{currentStreak}일</div>
                <p className="text-gray-600 text-sm mb-2">연속 학습 중!</p>
                <div className="mt-3 flex justify-center space-x-2">
                  {[...Array(7)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-5 h-5 rounded-full ${i < 5 ? 'bg-green-500' : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">최근 7일</p>
              </div>
            </Card>
            {/* 전체 진도율 + 뱃지 카드 나란히 배치 */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* Overall Progress */}
              <Card className="shadow-lg !rounded-button flex-1 mb-0 cursor-pointer min-h-[180px] transition-all duration-200 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-blue-200" onClick={() => setIsProgressModalOpen(true)}>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">전체 진도율</h3>
                  <div className="relative inline-block">
                    <div className="w-28 h-28 rounded-full border-8 border-blue-200 flex items-center justify-center mx-auto">
                      <span className="text-3xl font-bold text-blue-600">{progressOverview?.overall_progress || 0}%</span>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-semibold text-gray-800">완료 챕터</div>
                      <div className="text-blue-600 font-bold">{progressOverview?.completed_chapters || 0}/{progressOverview?.total_chapters || 0}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">학습 시간</div>
                      <div className="text-green-600 font-bold">24시간</div>
                    </div>
                  </div>
                </div>
              </Card>
              {/* Badges */}
              <Card className="shadow-lg !rounded-button flex-1 mb-0 cursor-pointer min-h-[180px] transition-all duration-200 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-yellow-200" onClick={() => setIsBadgeModalOpen(true)}>
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <Trophy className="mr-2 text-yellow-500" />
                    획득한 뱃지
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {badgeList.filter(badge => badge.unlocked).length === 0 ? (
                    <div className="col-span-3 text-center text-gray-400 py-6">획득한 뱃지가 없습니다.</div>
                  ) : (
                    badgeList.filter(badge => badge.unlocked).slice(0, 3).map((badge) => (
                      <div
                        key={badge.id}
                        className="text-center p-3 rounded-lg transition-all bg-yellow-50 border-2 border-yellow-200"
                        style={{ cursor: 'pointer' }}
                      >
                        {/* 아이콘 */}
                        <div className="flex justify-center items-center mb-1">
                          {badge.icon ? (
                            <img src={badge.icon} alt={badge.name} className="w-7 h-7" />
                          ) : (
                            <Trophy className="text-2xl mx-auto text-yellow-500" />
                          )}
                        </div>
                        {/* 이름 */}
                        <p className="text-xs mt-1 text-gray-800 font-semibold">{badge.name}</p>
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center space-x-12">
            <div className="flex flex-col items-center cursor-pointer text-blue-600">
              <HomeOutlined className="text-2xl mb-1" />
              <span className="text-xs font-medium">홈</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer text-gray-400 hover:text-blue-600 transition-colors"
                 onClick={() => navigate('/category')}>
              <BookOutlined className="text-2xl mb-1" />
              <span className="text-xs font-medium">학습</span>
            </div>
            <div className="flex flex-col items-center cursor-pointer text-gray-400 hover:text-blue-600 transition-colors"
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
    </div>
  );
};

export default Dashboard; 