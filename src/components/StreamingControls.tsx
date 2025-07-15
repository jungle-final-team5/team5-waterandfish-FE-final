import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Upload } from 'lucide-react';
import { StreamingConfig, STREAMING_PRESETS } from '@/types/streaming';

interface StreamingControlsProps {
  connectionStatus: string;
  transitionSign: () => void;
  className?: string;
  buttonClassName?: string;
}

const StreamingControls: React.FC<StreamingControlsProps> = ({
  connectionStatus,
  transitionSign,
  className = '',
  buttonClassName = ''
}) => {

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 스트리밍 버튼 */}
      <div className="flex items-center space-x-4">
        <Button onClick={transitionSign} className={buttonClassName}>다음으로 넘어가기</Button>
      </div>
    </div>
  );
};

export default StreamingControls; 