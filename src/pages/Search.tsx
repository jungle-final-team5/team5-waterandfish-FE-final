
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ArrowLeft, Search, BookOpen } from 'lucide-react';
import { useLearningData } from '@/hooks/useLearningData';

const SearchPage = () => {
  const navigate = useNavigate();
  const { categories } = useLearningData();
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);

  // 모든 수어 단어들을 평면화하여 검색 가능한 목록 생성
  const allSigns = categories.flatMap(category => 
    category.chapters.flatMap(chapter => 
      chapter.signs.map(sign => ({
        ...sign,
        categoryTitle: category.title,
        chapterTitle: chapter.title,
        categoryId: category.id,
        chapterId: chapter.id
      }))
    )
  );

  // 검색어에 따른 필터링
  const filteredSigns = allSigns.filter(sign =>
    sign.word.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSignSelect = (sign: any) => {
    navigate(`/learn/${encodeURIComponent(sign.word)}`);
    setOpen(false);
    setSearchTerm('');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredSigns.length > 0) {
      handleSignSelect(filteredSigns[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/home')}
                className="hover:bg-blue-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                홈으로
              </Button>
              <h1 className="text-xl font-bold text-gray-800">수어 검색</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Search Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-blue-600" />
                <span>수어 검색</span>
              </CardTitle>
              <p className="text-gray-600">학습하고 싶은 수어를 검색해보세요</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearchSubmit} className="space-y-4">
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input
                        placeholder="수어를 검색하세요 (예: 안녕하세요, 감사합니다)"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setOpen(e.target.value.length > 0);
                        }}
                        className="pr-10"
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandList>
                        {filteredSigns.length === 0 ? (
                          <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {filteredSigns.slice(0, 10).map((sign) => (
                              <CommandItem
                                key={sign.id}
                                onSelect={() => handleSignSelect(sign)}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div>
                                    <div className="font-medium">{sign.word}</div>
                                    <div className="text-sm text-gray-600">
                                      {sign.categoryTitle} • {sign.chapterTitle}
                                    </div>
                                  </div>
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    sign.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                    sign.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {sign.difficulty === 'easy' ? '쉬움' :
                                     sign.difficulty === 'medium' ? '보통' : '어려움'}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={filteredSigns.length === 0}
                >
                  <Search className="h-4 w-4 mr-2" />
                  검색하기
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Popular Signs Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-green-600" />
                <span>인기 수어</span>
              </CardTitle>
              <p className="text-gray-600">많이 학습되는 수어들을 확인해보세요</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {allSigns.slice(0, 12).map((sign) => (
                  <Button
                    key={sign.id}
                    variant="outline"
                    onClick={() => handleSignSelect(sign)}
                    className="h-auto p-3 hover:bg-blue-50 border-gray-200"
                  >
                    <div className="text-center">
                      <div className="font-medium text-gray-800">{sign.word}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {sign.categoryTitle}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SearchPage;