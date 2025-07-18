import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import API from './AxiosInstance';
import { useLearningData } from '@/hooks/useLearningData';
import { SlideScale } from './ui/slidescale';


interface SessionHeaderProps {
  currentMode: string;
  chapterId: string;
  currentSignIndex: number;
  progress: number;
  categoryId: string | undefined;
  navigate: (path: string) => void;
  feedback: string | null;
  
}


const SessionHeader = ({ 
  currentMode,  
  chapterId,
  currentSignIndex, 
  progress, 
  categoryId, 
  navigate,
  feedback
}: SessionHeaderProps) => {
  const [curChapter, setCurChapter] = useState<any>(null);
  const { findHierarchyByChapterId } = useLearningData();
  // feedback을 feedbackState로 변환
  const getFeedbackState = () => {
    if (feedback === 'correct') return 'correct';
    if (feedback === 'incorrect') return 'incorrect';
    return 'default';
  };
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
            onClick={() => navigate(`/home`)}
            className="hover:bg-blue-50 text-xl"
          >
            <ArrowLeft className="h-1 w-1 mr-2" />
            뒤로
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {currentMode} 모드
            </h1>
          </div>
        </div>
        
        {/* 중앙에 SlideScale 배치 */}
        <div className="flex-1 flex justify-center items-center mx-auto max-w-4xl" style={{ marginLeft: '10px' }}>
          
          {curChapter?.lessons && (
<SlideScale 
  words={curChapter.lessons.map((lesson: any) => lesson.word)} 
  currentIndex={currentSignIndex}
  feedbackState={getFeedbackState()} // 'default', 'correct', 'incorrect' 중 하나
/>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl text-gray-600 text-align-center">진행도</span>
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