
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus } from 'lucide-react';
import { Lesson } from '@/types/learning';

// 샘플 수어 데이터 (실제로는 API나 데이터베이스에서 가져올 것)
// const availableSigns: Lesson[] = [
//   { id: 'hello', word: '안녕하세요', category: 'greetings', difficulty: 'easy' },
//   { id: 'goodbye', word: '안녕히가세요', category: 'greetings', difficulty: 'easy' },
//   { id: 'thank-you', word: '감사합니다', category: 'greetings', difficulty: 'easy' },
//   { id: 'sorry', word: '죄송합니다', category: 'greetings', difficulty: 'medium' },
//   { id: 'nice-meet', word: '만나서 반갑습니다', category: 'greetings', difficulty: 'medium' },
//   { id: 'how-are-you', word: '어떻게 지내세요?', category: 'greetings', difficulty: 'medium' },
//   { id: 'fine-thanks', word: '잘 지내고 있어요', category: 'greetings', difficulty: 'medium' },
//   { id: 'see-you-later', word: '나중에 또 봐요', category: 'greetings', difficulty: 'hard' },
//   { id: 'have-good-day', word: '좋은 하루 되세요', category: 'greetings', difficulty: 'hard' },
//   { id: 'take-care', word: '몸조심하세요', category: 'greetings', difficulty: 'hard' },
//   { id: 'happy', word: '기쁘다', category: 'emotions', difficulty: 'easy' },
//   { id: 'sad', word: '슬프다', category: 'emotions', difficulty: 'easy' },
//   { id: 'angry', word: '화나다', category: 'emotions', difficulty: 'easy' },
//   { id: 'surprised', word: '놀라다', category: 'emotions', difficulty: 'medium' },
//   { id: 'worried', word: '걱정하다', category: 'emotions', difficulty: 'medium' },
//   { id: 'love', word: '사랑하다', category: 'emotions', difficulty: 'medium' },
//   { id: 'hate', word: '싫어하다', category: 'emotions', difficulty: 'medium' },
//   { id: 'excited', word: '신나다', category: 'emotions', difficulty: 'easy' },
//   { id: 'tired', word: '피곤하다', category: 'emotions', difficulty: 'easy' },
//   { id: 'hungry', word: '배고프다', category: 'emotions', difficulty: 'easy' }
// ];

interface SignWordSelectorProps {
  selectedSigns: Lesson[];
  onSelectionChange: (signs: Lesson[]) => void;
  categoryId: string;
  lessons : Lesson[]
}

export const SignWordSelector: React.FC<SignWordSelectorProps> = ({
  selectedSigns,
  onSelectionChange,
  categoryId,
  lessons
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');

  const filteredSigns = Array.isArray(lessons)
    ? lessons.filter(sign =>
        sign.word.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];


  const isSelected = (sign: Lesson) => {
    return selectedSigns.some(selected => selected.id === sign.id);
  };

  const toggleSign = (sign: Lesson) => {
    if (isSelected(sign)) {
      onSelectionChange(selectedSigns.filter(selected => selected.id !== sign.id));
    } else {
      onSelectionChange([...selectedSigns, sign]);
    }
  };

  const addNewSign = () => {
    if (newWord.trim()) {
      const newSign: Lesson = {
        id: `custom-${Date.now()}`,
        word: newWord.trim(),
        type:"word",
        category: categoryId,
        difficulty: newDifficulty
      };
      onSelectionChange([...selectedSigns, newSign]);
      setNewWord('');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '쉬움';
      case 'medium': return '보통';
      case 'hard': return '어려움';
      default: return difficulty;
    }
  };

  return (
    <div className="space-y-4">
      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="수어 단어 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 새 단어 추가 */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex space-x-2">
            <Input
              placeholder="새 수어 단어 추가..."
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              className="flex-1"
            />
            <select
              value={newDifficulty}
              onChange={(e) => setNewDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              className="px-3 py-2 border rounded-md"
            >
              <option value="easy">쉬움</option>
              <option value="medium">보통</option>
              <option value="hard">어려움</option>
            </select>
            <Button onClick={addNewSign} disabled={!newWord.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 선택된 수어 목록 */}
      {selectedSigns.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">선택된 수어 ({selectedSigns.length}개)</h4>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedSigns.map((sign) => (
              <span
                key={sign.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {sign.word}
                <button
                  onClick={() => toggleSign(sign)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 수어 목록 */}
      <div className="max-h-60 overflow-y-auto border rounded-md">
        <div className="space-y-2 p-4">
          {filteredSigns.map((sign) => (
            <div
              key={sign.id}
              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md"
            >
              <Checkbox
                checked={isSelected(sign)}
                onCheckedChange={() => toggleSign(sign)}
              />
              <div className="flex-1">
                <span className="font-medium">{sign.word}</span>
              </div>
              {/* <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(sign.difficulty)}`}>
                {getDifficultyText(sign.difficulty)}
              </span> */}
            </div>
          ))}
          {filteredSigns.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
