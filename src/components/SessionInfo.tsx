import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video } from 'lucide-react';
import { StreamingConfig, StreamingStats } from '@/types/streaming';

interface SessionInfoProps {
  chapterId?: string;
  currentStream: MediaStream | null;
  connectionStatus: string;
  wsList: any[];
  isStreaming: boolean;
  streamInfo: string;
  streamingStatus: string;
  streamingConfig: StreamingConfig;
  streamingStats: StreamingStats;
}

const SessionInfo: React.FC<SessionInfoProps> = ({
  chapterId,
  currentStream,
  connectionStatus,
  wsList,
  isStreaming,
  streamInfo,
  streamingStatus,
  streamingConfig,
  streamingStats,
}) => {
  const formatFileSize = (bytes: number) => {
    return Math.round(bytes / 1024);
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return bytesPerSecond > 0 ? `${Math.round(bytesPerSecond / 1024)}KB/s` : '측정 중...';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Video className="h-5 w-5 mr-2" />
          세션 정보
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">페이지:</span>
            <span>LearnSession.tsx</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">챕터 ID:</span>
            <span className="font-mono text-sm">{chapterId || '없음'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">비디오 상태:</span>
            <span className={currentStream ? 'text-green-600' : 'text-gray-500'}>
              {currentStream ? '활성' : '비활성'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">WebSocket 상태:</span>
            <span className={
              connectionStatus === 'connected' ? 'text-green-600' :
              connectionStatus === 'connecting' ? 'text-yellow-600' :
              'text-gray-500'
            }>
              {connectionStatus === 'connected' ? `연결됨 (${wsList.length})` :
               connectionStatus === 'connecting' ? '연결 중...' :
               wsList.length > 0 ? '연결 안됨' : '비활성'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">스트리밍 상태:</span>
            <span className={isStreaming ? 'text-green-600' : 'text-gray-500'}>
              {isStreaming ? '전송 중' : '대기 중'}
            </span>
          </div>
          
          {streamInfo && (
            <div className="flex justify-between">
              <span className="font-medium">스트림 정보:</span>
              <span className="text-sm">{streamInfo}</span>
            </div>
          )}
          
          {streamingStatus && (
            <div className="flex justify-between">
              <span className="font-medium">전송 상태:</span>
              <span className="text-sm">{streamingStatus}</span>
            </div>
          )}
          
          {isStreaming && (
            <>
              <div className="flex justify-between">
                <span className="font-medium">전송 프레임:</span>
                <span className="text-sm">{streamingStats.framesSent}개</span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">품질 설정:</span>
                <span className="text-sm">
                  {streamingConfig.maxWidth}×{streamingConfig.maxHeight} @ {streamingConfig.fps}fps (품질: {streamingConfig.quality})
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">실제 FPS:</span>
                <span className="text-sm">{streamingStats.actualFPS}fps</span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">전송 속도:</span>
                <span className={`text-sm ${streamingStats.bytesPerSecond > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                  {formatSpeed(streamingStats.bytesPerSecond)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">총 전송량:</span>
                <span className="text-sm">{formatFileSize(streamingStats.totalBytesSent)}KB</span>
              </div>
              
              {streamingStats.frameDropCount > 0 && (
                <div className="flex justify-between">
                  <span className="font-medium">전송 실패:</span>
                  <span className="text-sm text-red-600">{streamingStats.frameDropCount}회</span>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionInfo; 