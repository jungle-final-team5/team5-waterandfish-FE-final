import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useLearningData } from "@/hooks/useLearningData";


const SessionComplete = () => {
  // modeNum 1. 기본 학습
  // modeNum 2. 퀴즈 모드
  // modeNum 3. 복습 모드
  const { chapterId: paramChapterId, modeNum: num } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {  categories } = useLearningData();
  const chapterId = paramChapterId;
  const modeNum = num ? parseInt(num, 10) : undefined;
  
return (
      <div className="min-h-screen bg-gray-50">
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
                <div>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center py-12">
            <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">학습 완료!</h2>
            <p className="text-gray-600 mb-6">기깔난 것 </p>
            <div className="flex justify-center space-x-4">
                {modeNum === 1 && <h1>학습 완료 </h1>}
                {modeNum === 2 && <h1>퀴즈 완료 </h1>}
                {modeNum === 3 && <h1>복습 완료 </h1>}
              <Button onClick={() => navigate('/home')} className="bg-blue-600 hover:bg-blue-700">
                홈으로 돌아가기
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
};

export default SessionComplete;
