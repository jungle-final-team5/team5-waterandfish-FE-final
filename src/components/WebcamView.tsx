
import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff } from 'lucide-react';

interface WebcamViewProps {
  isRecording?: boolean;
}

const WebcamView = ({ isRecording = false }: WebcamViewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
        }
      } catch (err) {
        setError('웹캠 접근 권한이 필요합니다.');
        console.error('웹캠 접근 오류:', err);
      }
    };

    startWebcam();

    return () => {
      // 컴포넌트 언마운트 시 스트림 정리
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasPermission(true);
        setError(null);
      }
    } catch (err) {
      setError('웹캠 접근 권한을 허용해주세요.');
    }
  };

  return (
    <Card className="relative overflow-hidden h-full">
      <div className="aspect-video bg-gray-900 relative h-full min-h-[400px]">
        {hasPermission ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isRecording && (
              <div className="absolute inset-0 border-4 border-red-500 animate-pulse">
                <div className="absolute top-6 left-6 bg-red-500 text-white px-4 py-2 rounded-full text-base font-medium">
                  REC
                </div>
              </div>
            )}
            {/* 손 가이드 오버레이 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-3 border-dashed border-white/50 rounded-lg w-80 h-60 flex items-center justify-center">
                <span className="text-white/70 text-lg">손을 이 영역에 위치시켜주세요</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white">
            {error ? (
              <>
                <CameraOff className="h-20 w-20 mb-6 text-gray-400" />
                <p className="text-gray-400 mb-6 text-center text-lg">{error}</p>
                <Button onClick={requestPermission} variant="outline" className="text-white border-white hover:bg-white hover:text-gray-900 text-lg px-6 py-3">
                  <Camera className="h-5 w-5 mr-2" />
                  웹캠 권한 허용
                </Button>
              </>
            ) : (
              <>
                <Camera className="h-20 w-20 mb-6 text-gray-400" />
                <p className="text-gray-400 text-lg">웹캠을 연결하는 중...</p>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default WebcamView;