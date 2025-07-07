import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FeatureGuideProps {
  connectionStatus: string;
  isStreaming: boolean;
}

const FeatureGuide: React.FC<FeatureGuideProps> = ({
  connectionStatus,
  isStreaming,
}) => {
  const features = [
    {
      name: '실시간 비디오 스트림 입력',
      available: true,
    },
    {
      name: '다중 카메라 장치 지원',
      available: true,
    },
    {
      name: '자동 해상도 및 FPS 조정',
      available: true,
    },
    {
      name: '에러 처리 및 상태 모니터링',
      available: true,
    },
    {
      name: 'WebSocket 실시간 통신',
      available: connectionStatus === 'connected',
      status: connectionStatus === 'connected' ? '(활성)' : '(비활성)',
    },
    {
      name: 'Canvas 비디오 스트리밍',
      available: isStreaming,
      status: isStreaming ? '(활성)' : '(대기 중)',
    },
    {
      name: 'Canvas API (안정적)',
      available: true,
    },
    {
      name: '수어 인식 (향후 추가 예정)',
      available: false,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>사용 가능한 기능</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                feature.available ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
              <span className={
                feature.available 
                  ? feature.status 
                    ? feature.status.includes('활성') 
                      ? 'text-green-600' 
                      : 'text-gray-500'
                    : 'text-blue-500'
                  : 'text-gray-500'
              }>
                {feature.name} {feature.status || ''}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureGuide; 