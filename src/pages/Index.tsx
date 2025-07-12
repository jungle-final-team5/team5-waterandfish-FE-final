import { useState, useRef, useEffect } from 'react';
import debounce from 'lodash.debounce';
import { Search, ArrowRight, BookOpen, Users, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import API from '@/components/AxiosInstance';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const debouncedFetch = useRef(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }
      setLoading(true);
      try {
        const { data } = await API.get<{ success: boolean; data: { lessons: { word: string }[] } }>('/search', { params: { q: query, k: 5 } });
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
        setLoading(false);
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
    // 해당 키워드 학습 화면으로 이동
    navigate(`/learn/word/${encodeURIComponent(selectedItem)}`);
  };

  const handleStartLearning = () => {
    if (isAuthenticated) {
      navigate('/home');
    } else {
      navigate('/login');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">

            <div className="w-8 h-8 bg-indigo-200 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">🐟</span>
            </div>
            <span className="text-xl font-bold text-gray-800">수어지교</span>
          </div>
          {!isAuthenticated && (
            <Button 
              variant="outline" 
              onClick={() => navigate('/login')}
              className="hover:bg-violet-50 border border-gray-300"
            >
              로그인
            </Button>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6">
            인터랙티브 수어 학습의
            <span className="text-violet-600 block">새로운 시작</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8">
            실시간 모션 인식과 즉각적인 피드백으로 혼자서도 효과적으로 수어를 배워보세요
          </p>

          {/* Search Section */}
          <div className="max-w-2xl mx-auto mb-8 relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="배우고 싶은 수어를 검색해보세요 (예: 안녕하세요, 감사합니다)"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-12 pr-4 py-4 text-lg border-2 border-gray-200 focus:border-violet-500 rounded-xl"
              />
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchSelect(result)}
                    className="w-full px-4 py-3 text-left hover:bg-violet-50 first:rounded-t-xl last:rounded-b-xl transition-colors"
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

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleStartLearning}
              className="bg-violet-600 hover:bg-violet-700 text-lg px-8 py-4"
            >
              학습하러 가기
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">실시간 피드백</h3>
            <p className="text-gray-600">
              웹캠을 통한 실시간 모션 인식으로 즉각적인 학습 피드백을 받아보세요
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">체계적 학습</h3>
            <p className="text-gray-600">
              자음부터 문장까지 단계별 학습으로 체계적인 수어 습득이 가능합니다
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">맞춤형 복습</h3>
            <p className="text-gray-600">
              틀린 문제 자동 관리와 개인별 맞춤 복습으로 효율적인 학습을 지원합니다
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-gray-200">
        <div className="text-center text-gray-600">
          <p>&copy; 2025 수어지교. All right reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
