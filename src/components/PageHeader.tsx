import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  connectionStatus: string;
  wsList: any[];
  onBack: () => void;
  onShowStatus: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  connectionStatus,
  wsList,
  onBack,
  onShowStatus,
}) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          뒤로가기
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      </div>
      
      {/* WebSocket 상태 표시 */}
      {wsList.length > 0 && (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onShowStatus}
            className="flex items-center space-x-1"
          >
            {connectionStatus === 'connected' ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-xs">WebSocket ({wsList.length})</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default PageHeader; 