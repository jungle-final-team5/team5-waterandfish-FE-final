import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Users,
  Volume2,
  Lightbulb,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useLearningData } from '@/hooks/useLearningData';
import WebcamView from '@/components/WebcamView';
import VideoInput from '@/components/VideoInput';
import { useGlobalWebSocketStatus } from '@/contexts/GlobalWebSocketContext';

const SessionBegin = () => {
  const { chapterId: paramChapterId, modeNum: num } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { categories } = useLearningData();
  const chapterId = paramChapterId;
  const modeNum = num ? parseInt(num, 10) : undefined;

  // URL state에서 lesson_mapper 가져오기
  const lesson_mapper = location.state?.lesson_mapper || {};
  const { connectedCount, totalCount } = useGlobalWebSocketStatus();

  console.log('chapterId', chapterId);
  if (!chapterId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">페이지를 찾을 수 없습니다</h1>
          <Button onClick={() => navigate('/home')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    if (location.state && location.state.origin) {
      navigate(location.state.origin);
    } else {
      navigate('/category');
    }
  };

  // (배움/퀴즈) 페이지로 이동하여 해당하는 챕터의 (배움/퀴즈) 컨텐츠 시작
  const startContents = () => {
    if (modeNum === 1) {
      navigate(`/learn/chapter/${chapterId}`, { state: { lesson_mapper } });
    }
    else if (modeNum === 2) {
      navigate(`/quiz/chapter/${chapterId}`, { state: { lesson_mapper } });
    }
    else {
      navigate(`/review/chapter/${chapterId}`, { state: { lesson_mapper } });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="hover:bg-blue-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                뒤로가기
              </Button>
            </div>
          </div>
        </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 왼쪽: 가이드 정보 및 시작 버튼 */}
          <div className="space-y-6 flex flex-col justify-center">
            {/* 학습 전 준비사항 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-2xl font-bold">
                  <AlertCircle className="h-6 w-6 mr-3 text-orange-600 animate-bounce" />
                  {modeNum === 1 && ('학습 시작 전 준비사항')}
                  {modeNum === 2 && ('퀴즈 시작 전 준비사항')}
                  {modeNum === 3 && ('복습 시작 전 준비사항')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <Camera className="h-6 w-6 text-blue-600 mt-1 animate-pulse" />
                    <div>
                      <h4 className="font-semibold text-xl text-gray-900">카메라 준비</h4>
                      <p className="text-lg text-gray-700">
                        웹캠과 적정 거리(약 1-1.5m)를 유지하세요. 상체가 모두 보이도록 위치를 조정해주세요.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Users className="h-6 w-6 text-green-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-xl text-gray-900">조용한 환경</h4>
                      <p className="text-lg text-gray-700">
                        정확한 인식을 위해 주변에 다른 사람이 없는 공간에서 진행해주세요.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Lightbulb className="h-6 w-6 text-yellow-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-xl text-gray-900">충분한 조명</h4>
                      <p className="text-lg text-gray-700">
                        손의 움직임이 선명하게 보일 수 있도록 충분한 조명을 확보해주세요.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* 학습 팁 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-2xl font-bold">
                  <CheckCircle className="h-6 w-6 mr-3 text-green-600 animate-bounce" />
                  {modeNum === 1 && ('학습 팁')}
                  {modeNum === 2 && ('퀴즈 팁')}
                  {modeNum === 3 && ('복습 팁')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 text-lg text-gray-800">
                  {modeNum == 1 && (
                    <>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0 animate-pulse"></span>
                        동작을 천천히 따라하며 자연스럽게 익혀보세요
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0 animate-pulse"></span>
                        어려운 동작은 반복 연습을 통해 익숙해질 수 있습니다
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0 animate-pulse"></span>
                        설명 기능을 활용해 동작의 의미를 이해해보세요
                      </li>
                    </>
                  )}
                  {modeNum == 2 && (
                    <>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0 animate-pulse"></span>
                        시간 제한이 있으니 미리 동작을 연습해두세요
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0 animate-pulse"></span>
                        정확한 동작이 중요합니다. 천천히 정확하게 해주세요
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0 animate-pulse"></span>
                        틀린 문제는 자동으로 복습 목록에 추가됩니다
                      </li>
                    </>
                  )}
                  {modeNum == 3 && (
                    <>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0 animate-pulse"></span>
                        ULTIMATE SIGN LANGUAGE PLAYER가 되기 위해
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0 animate-pulse"></span>
                        복습을 하다니 정말 의지가 뚜렷한 모습이 있어 보기 좋습니다
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0 animate-pulse"></span>
                        죄송해요 말밖에 할게 없네요 해브어 굿 데이
                      </li>
                    </>
                  )}
                </ul>
              </CardContent>
            </Card>
            {/* 시작 버튼 */}
            <Card>
              <CardContent className="pt-8">
                <div className="text-center space-y-6">
                  <p className="text-gray-700 text-xl font-bold">
                    {modeNum === 1 && ('즐거운 학습 시간 !!')}
                    {modeNum === 2 && ('검증의 퀴즈시간!!')}
                    {modeNum === 3 && ('반성의 복습시간!!')}
                  </p>
                  {connectedCount !== totalCount && (
                    <>
                      <div className="flex items-center justify-center mb-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
                      </div>
                      <p className="text-gray-600">
                        수어 분류 서버에 연결중입니다
                      </p>
                    </>
                  )}
                  {connectedCount === totalCount && (
                    <>
                      <div className="flex items-center justify-center mb-2">
                        <CheckCircle className="h-6 w-6 text-green-600 animate-bounce" />
                      </div>
                      <p className="text-gray-600">
                        수어 분류 서버에 연결되었습니다
                      </p>
                    </>
                  )}
                  <Button
                    disabled={connectedCount !== totalCount}
                    onClick={startContents}
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-500 to-green-400 text-white text-2xl py-5 shadow-lg hover:scale-105 transition-transform duration-200 font-bold"
                  >
                    {'세션 시작'}
                    <ArrowRight className="h-5 w-5 ml-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* 오른쪽: 카메라 프리뷰 및 안내 */}
        </div>
      </main>
    </div>
  );
};

export default SessionBegin;