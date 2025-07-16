import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import API from './AxiosInstance';
import { useLearningData } from '@/hooks/useLearningData';

interface SessionHeaderProps {
  currentMode: string;
  chapterId: string;
  currentSignIndex: number;
  progress: number;
  categoryId: string | undefined;
  navigate: (path: string) => void;
}

const SessionHeader = ({ 
  currentMode,  
  chapterId,
  currentSignIndex, 
  progress, 
  categoryId, 
  navigate 
}: SessionHeaderProps) => {
  const [curChapter, setCurChapter] = useState<any>(null);
  const { findHierarchyByChapterId } = useLearningData();

  useEffect(() => {
    const loadChapter = async () => {
      try {
              if (chapterId !== "") {
        const chapterInfo = await findHierarchyByChapterId(chapterId);
        console.log("chapter information");
        console.log(chapterInfo);
        setCurChapter(chapterInfo);
        // lessons[배열], title로 다 해먹을 수 있겠다.

      }
      }
      catch (error) {
        console.error('챕터 데이터 로드 실패:', error);
      }

    };
        loadChapter();
    }, []);
  

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/category`)}
              className="hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {currentMode} : {"단어 입장"}
              </h1>
              <p className="text-sm text-gray-600">
                
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600">{currentMode} 모드</span>
              </div>
            <div className="w-32">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SessionHeader; 