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
        
        <div className="flex items-center space-x-2">
          <Upload className="h-4 w-4" />
          <span className="text-sm text-gray-600">
            {streamingStatus || '스트리밍 대기 중'}
          </span>
        </div>
      </div>
      
      {/* 스트리밍 설정 */}
      <div className="flex items-center space-x-4 flex-wrap">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">FPS:</label>
          <select
            value={streamingConfig.fps}
            onChange={(e) => handleConfigChange('fps', Number(e.target.value))}
            disabled={isStreaming}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value={10}>10fps (저품질)</option>
            <option value={15}>15fps (중품질)</option>
            <option value={20}>20fps (고품질)</option>
            <option value={30}>30fps (최고품질)</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">JPEG 품질:</label>
          <select
            value={streamingConfig.quality}
            onChange={(e) => handleConfigChange('quality', Number(e.target.value))}
            disabled={isStreaming}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value={0.3}>0.3 (저품질)</option>
            <option value={0.5}>0.5 (중품질)</option>
            <option value={0.7}>0.7 (고품질)</option>
            <option value={0.9}>0.9 (최고품질)</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">해상도:</label>
          <select
            value={`${streamingConfig.maxWidth}x${streamingConfig.maxHeight}`}
            onChange={(e) => handleResolutionChange(e.target.value)}
            disabled={isStreaming}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="160x120">160×120 (저해상도)</option>
            <option value="320x240">320×240 (중해상도)</option>
            <option value="640x480">640×480 (고해상도)</option>
          </select>
        </div>
      </div>
      
      {/* 프리셋 버튼 */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">프리셋:</span>
        {Object.entries(STREAMING_PRESETS).map(([key, preset]) => (
          <Button
            key={key}
            size="sm"
            variant="outline"
            disabled={isStreaming}
            onClick={() => onConfigChange(preset)}
            className="text-xs"
          >
            {key}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default StreamingControls; 