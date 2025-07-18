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
  ReloadOutlined,
  CheckCircleOutlined,
  LockOutlined
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
  Play,
  Sparkles
} from 'lucide-react';
import BadgeModal from '@/components/BadgeModal';
import StreakModal from '@/components/StreakModal';
import ProgressModal from '@/components/ProgressModal';
import { useToast } from '@/hooks/use-toast';
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
import { Dialog } from '@/components/ui/dialog';
import axios from 'axios';


const { Search: AntdSearch } = Input;

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
  const { showStatus } = useGlobalWebSocketStatus();
  // 검색 기능
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLessonIds, setSearchLessonIds] = useState<string[]>([]);
  const [isEnteringLesson, setIsEnteringLesson] = useState(false);
  const [placeholder, setPlaceholder] = useState('배우고 싶은 수어를 검색해보세요 (예: 병원, 학교)');
  // 진도율 상태
  const [progressOverview, setProgressOverview] = useState<ProgressOverview | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);

  // 추천 수어 상태
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

  // 마이페이지 모달 상태
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // 마이페이지 버튼 ref와 꼬리 위치 상태
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const [tailLeft, setTailLeft] = useState<number | null>(null);

  useEffect(() => {
    if (isProfileModalOpen && profileBtnRef.current) {
      const btnRect = profileBtnRef.current.getBoundingClientRect();
      const modalRect = document.getElementById('profile-modal')?.getBoundingClientRect();
      if (modalRect) {
        // 꼬리의 left를 버튼의 중앙에 맞춤 (모달 기준)
        setTailLeft(btnRect.left + btnRect.width / 2 - modalRect.left - 20); // 20은 꼬리 width/2
      }
    }
  }, [isProfileModalOpen]);

  // 전체 진도율 원형 그래프 변수 선언 (JSX 바깥에서)
  const percent = progressOverview?.overall_progress || 0;
  const radius = 56;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const progress = Math.max(0, Math.min(percent, 100));
  const offset = circumference - (progress / 100) * circumference;

  const { connectingChapter, setConnectingChapter, handleStartLearn, handleStartQuiz, handleStartSingleLearn } = useChapterHandler();

  


  // 시간대별 인사 메시지
  const getGreeting = () => {
    const currentTime = new Date().getHours();
    if (currentTime < 12) return '좋은 아침입니다';
    if (currentTime < 18) return '좋은 오후입니다';
    return '좋은 저녁입니다';
  };

  // 데이터 패칭
  useEffect(() => {
    disconnectWebSockets();
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
    const storedNickname = localStorage.getItem('nickname');
    if (storedNickname) setNickname(storedNickname);
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
        const { data } = await API.get<{ data: { lessons: any[] } }>('/search', { params: { q: query, k: 5 } });
        if (Array.isArray(data?.data?.lessons)) {
          setSearchResults(data.data.lessons.map((item) => item.word));
          setSearchLessonIds(data.data.lessons.map((item) => item.id));
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

  const handleSearchSelect = (selectedItem: string, index: number) => {
    setSearchQuery(selectedItem);
    setShowResults(false);
    handleStartSingleLearn(searchLessonIds[index]);
    setIsEnteringLesson(true);
  };

  useEffect(() => {
    if (isEnteringLesson) {
      setPlaceholder('연결 중...');
    }
    else {
      setPlaceholder('배우고 싶은 수어를 검색해보세요 (예: 병원, 학교)');
    }
  }, [isEnteringLesson]);

  const handleCardClick = async (cardType: string) => {
    switch (cardType) {
      case 'recent':
        // recentLearning 관련 코드 제거
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

  // 모든 챕터 상태
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [loadingChapterId, setLoadingChapterId] = useState<string | null>(null);

  useEffect(() => {
    API.get<{ success: boolean; data: { chapters: any[] }; message: string }>('/chapters')
      .then(res => {
        setAllChapters(res.data.data.chapters || []);
      })
      .catch(() => {
        setAllChapters([]);
      });
  }, []);

  // user 상태를 서버에서 받아옴
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    setUserLoading(true);
    API.get('/user/me', { withCredentials: true })
      .then(res => {
        setUser(res.data);
      })
      .catch(() => setUser(null))
      .finally(() => setUserLoading(false));
  }, []);

  // user 정보가 없으면 챕터 목록 렌더링 X
  if (userLoading) {
    return <div className="w-full flex justify-center items-center min-h-[400px]">Loading...</div>;
  }
  if (!user) {
    return <div className="w-full flex justify-center items-center min-h-[400px] text-red-500">유저 정보를 불러올 수 없습니다.</div>;
  }

  const chapterCurrentIndex = user.chapter_current_index ?? 0;

  // 지그재그(ㄹ자) 배치용: 3개씩 묶고, 짝수줄은 reverse + 각 chapter에 원래 인덱스 저장
  function zigzagChapters(chapters: any[], rowSize = 3) {
    const rows = [];
    for (let i = 0; i < chapters.length; i += rowSize) {
      const row = chapters.slice(i, i + rowSize);
      const indexedRow = row.map((chapter, idx) => ({
        ...chapter,
        _originalIndex: i + idx,
      }));
      // 짝수 번째 줄 (row index가 1, 3, 5...)는 뒤집기
      if ((i / rowSize) % 2 === 1) {
        indexedRow.reverse();
      }
      rows.push(indexedRow);
    }
    return rows;
  }
  const zigzagRows = zigzagChapters(allChapters, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <style>
        {`
          .!rounded-button {
            border-radius: 12px !important;
          }
          body {
            min-height: 1024px;
          }
          @keyframes flow {
            0% {
              background-position: 200% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
          @keyframes flow-reverse {
            0% {
              background-position: 0% 50%;
            }
            100% {
              background-position: 200% 50%;
            }
          }
        `}
      </style>

      {/* 상단 로고 및 버튼만 남기고 인사 메시지는 제거 */}
      <div className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* 로고 영역 */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-200 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">🐟</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-indigo-600">
                수어지교
              </span>
              <div className="text-xs text-gray-500 mt-0.5">인터랙티브 수어 학습 플랫폼</div>
            </div>
          </div>
          {/* 프로필/설정 버튼 - 알림(벨) 아이콘 제거 */}
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            {/* 알림 버튼 제거됨 */}
            {/* 마이페이지 버튼 아래에 말풍선 모달 (버튼 div 내부에서 조건부 렌더링) */}
            <div className="flex items-center space-x-4 mt-4 md:mt-0 relative">
              <Button ref={profileBtnRef} onClick={() => setIsProfileModalOpen((v) => !v)} variant="ghost" size="icon">
                <User className="h-5 w-5 text-gray-600" />
              </Button>
              {isProfileModalOpen && (
                <div className="absolute left-1/2 transform -translate-x-1/2 top-12 z-50 w-[340px] max-w-xs flex justify-center pointer-events-auto" id="profile-modal">
                  <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-full flex flex-col items-center" style={{ minWidth: 300 }}>
                    {/* 말풍선 꼬리 (동적 위치) */}
                    <div className="absolute -top-6" style={tailLeft !== null ? { left: tailLeft } : { left: '50%', transform: 'translateX(-50%)' }}>
                      <svg width="40" height="40" viewBox="0 0 40 40"><polygon points="20,0 40,40 0,40" fill="#fff" /></svg>
                    </div>
                    {/* 연속학습 카드 */}
                    <div className="w-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl p-4 text-white mb-4 flex items-center justify-between cursor-pointer" onClick={() => { setIsProfileModalOpen(false); setIsStreakModalOpen(true); }}>
                      <div>
                        <div className="font-semibold">연속 학습</div>
                        <div className="text-sm opacity-90">{currentStreak}일 연속 학습 중!</div>
                      </div>
                      <div className="text-2xl">🔥</div>
                    </div>
                    {/* 뱃지 카드 */}
                    <div className="w-full bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-center justify-between cursor-pointer" onClick={() => { setIsProfileModalOpen(false); setIsBadgeModalOpen(true); }}>
                      <div>
                        <div className="font-semibold text-gray-800">획득한 뱃지</div>
                        <div className="text-sm text-gray-600">총 {badgeCount}개 획득</div>
                      </div>
                      <Trophy className="text-2xl text-yellow-500" />
                    </div>
                    {/* 진도율 카드 */}
                    <div className="w-full bg-green-50 border border-green-200 rounded-xl p-4 mb-6 cursor-pointer" onClick={() => { setIsProfileModalOpen(false); setIsProgressModalOpen(true); }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-gray-800">전체 진도율</div>
                        <span className="text-sm font-medium text-green-600">{progressOverview?.overall_progress ?? 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${progressOverview?.overall_progress ?? 0}%` }}></div>
                      </div>
                    </div>
                    {/* 계정 설정 버튼 */}
                    <Button className="w-full bg-cyan-500 text-white py-3 rounded-lg hover:bg-cyan-600 transition-colors font-semibold text-base" onClick={() => { setIsProfileModalOpen(false); navigate('/profile'); }}>
                      계정 설정
                    </Button>
                  </div>
                </div>
              )}
              <Button onClick={handleLogout} variant="ghost" size="icon" aria-label="logout">
                <LogOut className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 인사 메시지: 중앙 검색창 바로 위 */}
      <div className="w-full max-w-2xl mx-auto mt-8 mb-2 text-center">
        <h1 className="text-3xl font-bold text-indigo-600 mb-2">
          {getGreeting()}, {nickname}님! 👋
        </h1>
        <p className="text-gray-600 mb-2">오늘도 수어 학습을 시작해볼까요?</p>
      </div>

      {/* 중앙 검색 바 (Home.tsx 스타일) */}
      <div className="w-full max-w-2xl mx-auto mt-8 mb-8 relative transition-all duration-200 rounded-xl bg-white">
        <div className="relative">
          {connectingChapter ? (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2 "></div>
            </div>
          ) : (
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          )}
          <CustomInput
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            className="w-full pl-12 pr-4 py-4 text-lg border-2 !border-gray-200 focus:!border-transparent focus:ring-2 focus:ring-blue-400 rounded-xl h-14 transition-all"
            disabled={isEnteringLesson}
          />
        </div>
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-[9999]">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => handleSearchSelect(result, index)}
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
      {/* 모든 챕터 카드 그리드 (백엔드 /chapters API 사용) */}
      <div className="flex flex-col gap-16 relative w-full max-w-7xl mx-auto px-8 pb-24">
        {zigzagRows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16"
          >
            {row.map((chapter, idx) => {
              const globalIdx = chapter._originalIndex;
              let status;
              if (globalIdx < chapterCurrentIndex) status = 'completed';
              else if (globalIdx === chapterCurrentIndex) status = 'current';
              else status = 'locked';

              const isOddRow = rowIdx % 2 === 0; // 0,2,...이 왼→오
              const isRightColInOddRow = isOddRow && idx === row.length - 1;
              const isLeftColInEvenRow = !isOddRow && idx === 0;
              const showVerticalLine = (isRightColInOddRow || isLeftColInEvenRow) && (globalIdx + 3 < allChapters.length);

              // 가로 연결선: 왼→오 줄은 오른쪽, 오→왼 줄은 왼쪽
              const showHorizontalLine = isOddRow
                ? idx < row.length - 1 // 오른쪽에 선
                : idx > 0;             // 왼쪽에 선

              return (
                <div
                  key={chapter.id}
                  className={`relative group ${
                    status === 'locked'
                      ? 'opacity-60 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                  style={{ minHeight: 340, height: 340, maxWidth: 480, width: '100%' }}
                >
                  {/* 👉 수직 연결선 */}
                  {showVerticalLine && (
                    <div
                      className="absolute left-1/2 bottom-[-64px] w-[5px] h-[64px] rounded-full bg-cyan-200 overflow-hidden z-0"
                      style={{
                        backgroundImage: 'linear-gradient(180deg, rgba(103,232,249,0.4), rgba(103,232,249,0.8))',
                        backgroundSize: '100% 200%',
                        animation: 'flow 4s linear infinite',
                        boxShadow: '0 0 6px rgba(103,232,249,0.4)',
                      }}
                    ></div>
                  )}
                  {/* 👉 가로 연결선 (지그재그 방향에 따라 위치 다름) */}
                  {showHorizontalLine && (
                    <div
                      className={`absolute top-1/2 ${isOddRow ? '-right-16' : '-left-16'} w-16 h-[5px] rounded-full bg-cyan-200 overflow-hidden`}
                      style={{
                        backgroundImage: 'linear-gradient(90deg, rgba(103,232,249,0.4), rgba(103,232,249,0.8))',
                        backgroundSize: '200% 100%',
                        animation: isOddRow ? 'flow 4s linear infinite' : 'flow-reverse 4s linear infinite',
                        boxShadow: '0 0 6px rgba(103,232,249,0.4)',
                      }}
                    ></div>
                  )}
                  {/* Chapter Card */}
                  <div
                    className={`h-full p-8 rounded-3xl shadow-lg border-2 transition-all duration-300 relative
                      ${status === 'completed'
                        ? 'bg-white border-emerald-200 group-hover:shadow-2xl group-hover:-translate-y-2 group-hover:rotate-1'
                        : status === 'locked'
                          ? 'bg-gray-50 border-gray-100'
                          : 'bg-white border-cyan-100 group-hover:shadow-2xl group-hover:-translate-y-2 group-hover:bg-cyan-50 group-hover:border-cyan-300'
                    }
                    `}
                    onClick={async () => {
                      if (status === 'locked' || loadingChapterId) return;
                      if(chapter.title == "자음"){
                        await API.post(`/progress/chapters/${chapter.id}`);
                        return navigate(`/test/letter/consonant/study`);
                        
                      }else if(chapter.title == "모음"){
                        await API.post(`/progress/chapters/${chapter.id}`);
                        return navigate(`/test/letter/vowel/study`);
                      }else if(chapter.title == "단어 해체"){
                        await API.post(`/progress/chapters/${chapter.id}`);
                        return navigate(`/test/word/word/study`);
                      }
                      setLoadingChapterId(chapter.id);
                      const lessonIds = (chapter.lessons || []).map((lesson) => lesson.id);
                      await handleStartLearn(chapter.id, lessonIds, '/home');
                      setLoadingChapterId(null);
                    }}
                  >
                    {/* 오버레이: 로딩 중일 때 카드 전체 흐리게 + 중앙 스피너 */}
                    {loadingChapterId === chapter.id && (
                      <div className="absolute inset-0 bg-gray-200/60 flex items-center justify-center z-20 rounded-3xl">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="flex justify-between items-start mb-6">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                          status === 'completed'
                            ? 'bg-emerald-400 text-white'
                            : status === 'current'
                              ? 'bg-white border-4 border-cyan-400 text-cyan-500'
                              : 'bg-gray-300 text-gray-500'
                        }`}
                      >
                        {status === 'completed' ? (
                          <CheckCircleOutlined className="text-xl" />
                        ) : status === 'locked' ? (
                          <LockOutlined className="text-lg" />
                        ) : (
                          globalIdx + 1
                        )}
                      </div>
                      {status === 'current' && (
                        <span className="bg-cyan-100 text-cyan-600 px-3 py-1 rounded-full text-sm font-medium">
                          진행 중
                        </span>
                      )}
                    </div>
                    {/* Content */}
                    <div>
                      <h3
                        className={`text-xl font-bold mb-6 ${
                          status === 'locked' ? 'text-gray-400' : 'text-gray-800'
                        }`}
                      >
                        {chapter.title}
                      </h3>
                      {/* Example Signs Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {(chapter.lessons || []).slice(0, 4).map((lesson, lidx) => (
                          <div
                            key={lidx}
                            className={`rounded-xl p-4 flex items-center justify-center transition-colors duration-300
                          ${status === 'completed'
                            ? 'bg-emerald-50 group-hover:bg-emerald-100'
                            : 'bg-cyan-50 group-hover:bg-cyan-100'}
                        `}
                          >
                            <span className={`text-sm font-medium ${status === 'completed' ? 'text-emerald-700' : 'text-cyan-700'}`}>{lesson.word}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Locked 안내 멘트: 카드 하단 고정 */}
                    {status === 'locked' && (
                      <div className="absolute bottom-6 left-0 w-full flex justify-center">
                        <div className="flex items-center space-x-2 text-gray-400">
                          <LockOutlined />
                          <span className="text-sm">이전 챕터를 완료하면 잠금이 해제됩니다</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* 검색창 밑은 모두 제거, 빈 공간만 남김 */}
      <div className="h-40"></div>
      {/* 마이페이지 관련 모달들 */}
      <BadgeModal isOpen={isBadgeModalOpen} onClose={() => setIsBadgeModalOpen(false)} />
      <StreakModal isOpen={isStreakModalOpen} onClose={() => setIsStreakModalOpen(false)} />
      <ProgressModal isOpen={isProgressModalOpen} onClose={() => setIsProgressModalOpen(false)} />
    </div>
  );
};

export default Dashboard; 