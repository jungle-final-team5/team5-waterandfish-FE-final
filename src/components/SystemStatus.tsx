import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StreamingStats } from '@/types/streaming';

interface SystemStatusProps {
  currentStream: MediaStream | null;
  connectionStatus: string;
  wsList: any[];
  isStreaming: boolean;
  streamingStats: StreamingStats;
}

const SystemStatus: React.FC<SystemStatusProps> = ({
  currentStream,
  connectionStatus,
  wsList,
  isStreaming,
  streamingStats,
}) => {
  const formatSpeed = (bytesPerSecond: number) => {
    return Math.round(bytesPerSecond / 1024);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>시스템 상태</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-green-800 font-medium">
              ✅ 라우팅 정상 작동
            </p>
            <p className="text-green-600 text-sm mt-1">
              LearnSession 페이지가 성공적으로 로드되었습니다.
            </p>
          </div>
          
          <div className={`p-4 rounded-lg ${
            currentStream ? 'bg-green-50' : 'bg-yellow-50'
          }`}>
            <p className={`font-medium ${
              currentStream ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {currentStream ? '✅' : '⚠️'} 비디오 입력 {currentStream ? '연결됨' : '대기 중'}
            </p>
            <p className={`text-sm mt-1 ${
              currentStream ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {currentStream 
                ? '카메라가 정상적으로 연결되어 비디오 스트림을 수신하고 있습니다.'
                : '카메라 연결을 시작하려면 "시작" 버튼을 클릭하세요.'
              }
            </p>
          </div>
          
          {/* WebSocket 상태 표시 */}
          {wsList.length > 0 && (
            <div className={`p-4 rounded-lg ${
              connectionStatus === 'connected' ? 'bg-green-50' : 
              connectionStatus === 'connecting' ? 'bg-yellow-50' : 'bg-red-50'
            }`}>
              <p className={`font-medium ${
                connectionStatus === 'connected' ? 'text-green-800' : 
                connectionStatus === 'connecting' ? 'text-yellow-800' : 'text-red-800'
              }`}>
                {connectionStatus === 'connected' ? '✅' : 
                 connectionStatus === 'connecting' ? '⚠️' : '❌'} 
                WebSocket {connectionStatus === 'connected' ? '연결됨' : 
                           connectionStatus === 'connecting' ? '연결 중' : '연결 안됨'}
              </p>
              <p className={`text-sm mt-1 ${
                connectionStatus === 'connected' ? 'text-green-600' : 
                connectionStatus === 'connecting' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {connectionStatus === 'connected' 
                  ? `${wsList.length}개 서버에 연결되어 실시간 통신이 가능합니다.`
                  : connectionStatus === 'connecting'
                  ? '서버에 연결을 시도하고 있습니다...'
                  : '서버 연결에 실패했습니다. 새로고침 후 다시 시도해주세요.'
                }
              </p>
            </div>
          )}
          
          {/* 스트리밍 상태 표시 */}
          {currentStream && (
            <div className={`p-4 rounded-lg ${
              isStreaming ? 'bg-green-50' : 'bg-blue-50'
            }`}>
              <p className={`font-medium ${
                isStreaming ? 'text-green-800' : 'text-blue-800'
              }`}>
                {isStreaming ? '📡' : '📹'} 비디오 스트리밍 {isStreaming ? '전송 중' : '대기 중'}
              </p>
              <p className={`text-sm mt-1 ${
                isStreaming ? 'text-green-600' : 'text-blue-600'
              }`}>
                {isStreaming 
                  ? `Canvas 방식으로 비디오를 ${wsList.length}개 서버로 실시간 전송하고 있습니다. (${formatSpeed(streamingStats.bytesPerSecond)}KB/s)`
                  : '스트리밍을 시작하려면 "스트리밍 시작" 버튼을 클릭하세요.'
                }
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemStatus; 