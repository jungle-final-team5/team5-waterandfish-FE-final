import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Upload } from 'lucide-react';
import { StreamingConfig, STREAMING_PRESETS } from '@/types/streaming';

interface StreamingControlsProps {
  isStreaming: boolean;
  streamingStatus: string;
  streamingConfig: StreamingConfig;
  currentStream: MediaStream | null;
  connectionStatus: string;
  onStartStreaming: () => void;
  onStopStreaming: () => void;
  onConfigChange: (config: StreamingConfig) => void;
  transitionSign: () => void;
}

const StreamingControls: React.FC<StreamingControlsProps> = ({
  isStreaming,
  streamingStatus,
  streamingConfig,
  currentStream,
  connectionStatus,
  onStartStreaming,
  onStopStreaming,
  onConfigChange,
  transitionSign
}) => {
  const handleConfigChange = (key: keyof StreamingConfig, value: number | string) => {
    onConfigChange({ ...streamingConfig, [key]: value });
  };

  const handleResolutionChange = (resolution: string) => {
    const [width, height] = resolution.split('x').map(Number);
    onConfigChange({ ...streamingConfig, maxWidth: width, maxHeight: height });
  };

  return (
    <div className="space-y-3">
      {/* 스트리밍 버튼 */}
      <div className="flex items-center space-x-4">
        <Button
          onClick={isStreaming ? onStopStreaming : onStartStreaming}
          disabled={!currentStream || connectionStatus !== 'connected'}
          variant={isStreaming ? "destructive" : "default"}
          className="flex items-center space-x-2"
        >
          {isStreaming ? (
            <>
              <Pause className="h-4 w-4" />
              <span>스트리밍 중지</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>스트리밍 시작</span>
            </>
          )}
        </Button>
        <Button onClick={transitionSign}>[DEBUG] 챕터 내 다음 내용으로 넘어가기</Button>
      </div>
    
    </div>
  );
};

export default StreamingControls; 