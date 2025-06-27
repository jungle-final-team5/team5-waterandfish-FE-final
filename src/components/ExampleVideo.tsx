
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface ExampleVideoProps {
  keyword: string;
  autoLoop?: boolean;
}

const ExampleVideo = ({ keyword, autoLoop = false }: ExampleVideoProps) => {
  const [isPlaying, setIsPlaying] = useState(autoLoop);
  const [showReplay, setShowReplay] = useState(false);

  useEffect(() => {
    if (autoLoop) {
      setIsPlaying(true);
      startAutoLoop();
    }
  }, [autoLoop]);

  const startAutoLoop = () => {
    const loop = () => {
      setIsPlaying(true);
      setShowReplay(false);
      
      // 3초 후 영상 종료 시뮬레이션
      setTimeout(() => {
        setIsPlaying(false);
        // 1초 후 다시 시작 (자동 반복)
        setTimeout(() => {
          if (autoLoop) {
            loop();
          } else {
            setShowReplay(true);
          }
        }, 1000);
      }, 3000);
    };
    
    loop();
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setShowReplay(false);
    
    // 3초 후 영상 종료 시뮬레이션
    setTimeout(() => {
      setIsPlaying(false);
      setShowReplay(true);
    }, 3000);
  };

  const handleReplay = () => {
    handlePlay();
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 relative">
        {/* 실제로는 여기에 수어 예시 영상이 들어갑니다 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="text-white text-6xl">🤟</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">"{keyword}"</h3>
            <p className="text-gray-600 text-sm">
              {autoLoop ? '수어 동작 예시 (반복 재생)' : '수어 동작 예시'}
            </p>
          </div>
        </div>

        {/* 재생 컨트롤 - 자동 반복 모드가 아닐 때만 표시 */}
        {!autoLoop && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            {!isPlaying && !showReplay && (
              <Button onClick={handlePlay} className="bg-blue-600 hover:bg-blue-700">
                <Play className="h-4 w-4 mr-2" />
                재생
              </Button>
            )}
            
            {isPlaying && (
              <Button disabled className="bg-blue-600">
                <div className="animate-pulse flex items-center">
                  <Pause className="h-4 w-4 mr-2" />
                  재생 중...
                </div>
              </Button>
            )}
            
            {showReplay && (
              <Button onClick={handleReplay} variant="outline" className="bg-white/90">
                <RotateCcw className="h-4 w-4 mr-2" />
                다시 보기
              </Button>
            )}
          </div>
        )}

        {/* 자동 반복 모드 표시 */}
        {autoLoop && (
          <div className="absolute top-4 right-4">
            <div className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
              반복 재생
            </div>
          </div>
        )}

        {/* 진행 바 */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div 
              className="h-full bg-blue-600 animate-pulse" 
              style={{ 
                animation: 'progressBar 3s linear forwards',
                width: '0%'
              }} 
            />
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes progressBar {
          from { width: 0% }
          to { width: 100% }
        }
      `}</style>
    </Card>
  );
};

export default ExampleVideo;