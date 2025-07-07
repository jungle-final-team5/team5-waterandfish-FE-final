import React from 'react';
import { useParams } from 'react-router-dom';
import VideoInput from '@/components/VideoInput';
import StreamingControls from '@/components/StreamingControls';
import SessionInfo from '@/components/SessionInfo';
import SystemStatus from '@/components/SystemStatus';
import FeatureGuide from '@/components/FeatureGuide';
import PageHeader from '@/components/PageHeader';
import { useVideoStreaming } from '@/hooks/useVideoStreaming';
import useWebsocket from '@/hooks/useWebsocket';
import { useGlobalWebSocketStatus } from '@/contexts/GlobalWebSocketContext';

const LearnSession = () => {
  const { chapterId } = useParams();
  
  // WebSocket 훅
  const { connectionStatus, wsList, broadcastMessage } = useWebsocket();
  const { showStatus } = useGlobalWebSocketStatus();
  
  // 비디오 스트리밍 훅
  const {
    isStreaming,
    streamingStatus,
    currentStream,
    streamInfo,
    streamingConfig,
    streamingStats,
    canvasRef,
    videoRef,
    startStreaming,
    stopStreaming,
    setStreamingConfig,
    handleStreamReady,
    handleStreamError,
  } = useVideoStreaming({
    connectionStatus,
    broadcastMessage,
  });

  // 이벤트 핸들러
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="단어 학습 세션"
          connectionStatus={connectionStatus}
          wsList={wsList}
          onBack={handleBack}
          onShowStatus={showStatus}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 비디오 입력 영역 */}
          <div className="space-y-4">
            <VideoInput
              width={640}
              height={480}
              autoStart={false}
              showControls={true}
              onStreamReady={handleStreamReady}
              onStreamError={handleStreamError}
              className="h-full"
            />
            
            <StreamingControls
              isStreaming={isStreaming}
              streamingStatus={streamingStatus}
              streamingConfig={streamingConfig}
              currentStream={currentStream}
              connectionStatus={connectionStatus}
              onStartStreaming={startStreaming}
              onStopStreaming={stopStreaming}
              onConfigChange={setStreamingConfig}
            />
            
            {/* 숨겨진 비디오 요소들 */}
            <div className="hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} />
            </div>
          </div>
        
          {/* 정보 패널 */}
          <div className="space-y-6">
            <SessionInfo
              chapterId={chapterId}
              currentStream={currentStream}
              connectionStatus={connectionStatus}
              wsList={wsList}
              isStreaming={isStreaming}
              streamInfo={streamInfo}
              streamingStatus={streamingStatus}
              streamingConfig={streamingConfig}
              streamingStats={streamingStats}
            />

            <SystemStatus
              currentStream={currentStream}
              connectionStatus={connectionStatus}
              wsList={wsList}
              isStreaming={isStreaming}
              streamingStats={streamingStats}
            />

            <FeatureGuide
              connectionStatus={connectionStatus}
              isStreaming={isStreaming}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnSession;
