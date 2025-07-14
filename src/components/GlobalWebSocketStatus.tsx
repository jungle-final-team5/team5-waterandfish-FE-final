import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  ChevronDown,
  ChevronUp,
  X,
  Minimize2,
  Settings,
  RefreshCw,
  Timer,
  AlertCircle
} from 'lucide-react';
import useWebsocket from '@/hooks/useWebsocket';

// 전역 웹소켓 상태 표시 컴포넌트의 인터페이스 정의
interface GlobalWebSocketStatusProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  showByDefault?: boolean;
  allowMinimize?: boolean;
}

// 전역 웹소켓 상태 표시 컴포넌트
const GlobalWebSocketStatus: React.FC<GlobalWebSocketStatusProps> = ({
  position = 'top-right',
  showByDefault = false,
  allowMinimize = true
}) => {
  const [isVisible, setIsVisible] = useState(showByDefault);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [autoReconnectEnabled, setAutoReconnectEnabled] = useState(true);
  const [reconnectConfig, setReconnectConfig] = useState({
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000
  });

  // 전역 웹소켓 상태 사용
  const {
    connections,
    globalStatus,
    connectedCount,
    errorCount,
    totalConnections,
    lastConnectedTime,
    globalError,
    disconnectWebSockets,
    disconnectWebSocket,
    reconnectWebSocket,
    autoReconnectService
  } = useWebsocket();

  // 자동 재연결 상태 관리
  const [reconnectStates, setReconnectStates] = useState(new Map());
  const [autoReconnectStatus, setAutoReconnectStatus] = useState({
    isRunning: false,
    activeReconnects: 0
  });

  useEffect(() => {
    setIsMinimized(true);
  }, []);

  // 자동 재연결 상태 주기적 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      const status = autoReconnectService.getStatus();
      const states = autoReconnectService.getAllReconnectStates();
      
      setAutoReconnectStatus({
        isRunning: status.isRunning,
        activeReconnects: status.activeReconnects
      });
      setReconnectStates(states);
    }, 1000);

    return () => clearInterval(interval);
  }, [autoReconnectService]);

  // 자동 재연결 설정 업데이트
  const updateAutoReconnectConfig = () => {
    autoReconnectService.updateConfig(reconnectConfig);
  };

  // 위치별 CSS 클래스
  const getPositionClasses = () => {
    const baseClasses = "fixed z-50 transition-all duration-300 ease-in-out";
    
    switch (position) {
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      default:
        return `${baseClasses} top-4 right-4`;
    }
  };

  // 연결 상태에 따른 아이콘 및 색상
  const getStatusDisplay = () => {
    switch (globalStatus) {
      case 'connected':
        return {
          icon: <Wifi className="h-4 w-4" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          badge: 'bg-green-500'
        };
      case 'connecting':
        return {
          icon: <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200',
          badge: 'bg-yellow-500'
        };
      case 'partial':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200',
          badge: 'bg-orange-500'
        };
      case 'error':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          badge: 'bg-red-500'
        };
      default:
        return {
          icon: <WifiOff className="h-4 w-4" />,
          color: 'text-gray-400',
          bgColor: 'bg-gray-50 border-gray-200',
          badge: 'bg-gray-500'
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  // WebSocket이 연결되지 않았으면 표시하지 않음
  if (connections.length === 0 && globalStatus === 'disconnected') {
    return null;
  }

  // 최소화 상태일 때의 컴팩트 뷰
  if (isMinimized) {
    return (
      <div className={getPositionClasses()}>
        <div 
          className={`flex items-center space-x-2 p-2 rounded-lg shadow-lg border cursor-pointer ${statusDisplay.bgColor}`}
          onClick={() => setIsMinimized(false)}
        >
          <div className={statusDisplay.color}>
            {statusDisplay.icon}
          </div>
          <span className={`text-xs font-medium ${statusDisplay.color}`}>
            {connectedCount}/{totalConnections}
          </span>
          {autoReconnectStatus.activeReconnects > 0 && (
            <div className="flex items-center space-x-1">
              <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
              <span className="text-xs text-blue-500">{autoReconnectStatus.activeReconnects}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 전체 표시 상태
  return (
    <div className={getPositionClasses()}>
      <Card className={`w-96 shadow-lg border ${statusDisplay.bgColor} ${isDragging ? 'cursor-grabbing' : 'cursor-auto'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>WebSocket 상태</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Badge className={`${statusDisplay.badge} text-white text-xs`}>
                {globalStatus === 'connected' ? '전체 연결' :
                 globalStatus === 'connecting' ? '연결 중' :
                 globalStatus === 'partial' ? '부분 연결' :
                 globalStatus === 'error' ? '오류' : '연결 안됨'}
              </Badge>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="h-6 w-6 p-0"
              >
                <Settings className="h-3 w-3" />
              </Button>
              
              {allowMinimize && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(true)}
                  className="h-6 w-6 p-0"
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* 전체 연결 정보 */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center justify-between">
                <span>총 연결:</span>
                <span className="font-medium">{totalConnections}개</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>활성:</span>
                <span className="text-green-600 font-medium">{connectedCount}개</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>오류:</span>
                <span className="text-red-600 font-medium">{errorCount}개</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>재연결:</span>
                <span className="text-blue-600 font-medium flex items-center space-x-1">
                  {autoReconnectStatus.activeReconnects > 0 && (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  )}
                  <span>{autoReconnectStatus.activeReconnects}개</span>
                </span>
              </div>
            </div>

            {/* 자동 재연결 상태 */}
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-xs">자동 재연결:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-xs ${autoReconnectStatus.isRunning ? 'text-green-600' : 'text-gray-500'}`}>
                  {autoReconnectStatus.isRunning ? '활성' : '비활성'}
                </span>
                <Switch
                  checked={autoReconnectEnabled}
                  onCheckedChange={(checked) => {
                    setAutoReconnectEnabled(checked);
                    if (checked) {
                      autoReconnectService.start();
                    } else {
                      autoReconnectService.stop();
                    }
                  }}
                />
              </div>
            </div>

            {/* 개별 연결 상태 */}
            <div className="border-t pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConnectionDetails(!showConnectionDetails)}
                className="w-full justify-between text-xs"
              >
                <span>연결 상세 정보</span>
                {showConnectionDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
              
              {showConnectionDetails && (
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {connections.map((connection, index) => {
                    const reconnectState = reconnectStates.get(connection.id);
                    
                    return (
                      <div key={connection.id} className="p-2 bg-gray-50 rounded text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">연결 {index + 1}</span>
                          <div className="flex items-center space-x-1">
                            <Badge 
                              className={`text-xs ${
                                connection.status === 'connected' ? 'bg-green-500' :
                                connection.status === 'connecting' || connection.status === 'reconnecting' ? 'bg-yellow-500' :
                                'bg-red-500'
                              } text-white`}
                            >
                              {connection.status === 'connected' ? '연결됨' :
                               connection.status === 'connecting' ? '연결 중' :
                               connection.status === 'reconnecting' ? '재연결 중' :
                               connection.status === 'error' ? '오류' : '연결 안됨'}
                            </Badge>
                            
                            {connection.status !== 'connected' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => reconnectWebSocket(connection.id)}
                                className="h-5 w-5 p-0"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => disconnectWebSocket(connection.id)}
                              className="h-5 w-5 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-600 mb-1">
                          {connection.url}
                        </div>
                        
                        {reconnectState && (
                          <div className="text-xs text-blue-600 flex items-center space-x-1">
                            <Timer className="h-3 w-3" />
                            <span>재시도: {reconnectState.retries}/{reconnectConfig.maxRetries}</span>
                          </div>
                        )}
                        
                        {connection.error && (
                          <div className="text-xs text-red-600 mt-1">
                            {connection.error}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 설정 패널 */}
            {showSettings && (
              <div className="border-t pt-2 space-y-2">
                <div className="text-xs font-medium">재연결 설정</div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="maxRetries" className="text-xs">최대 재시도:</Label>
                    <Input
                      id="maxRetries"
                      type="number"
                      value={reconnectConfig.maxRetries}
                      onChange={(e) => setReconnectConfig(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 5 }))}
                      className="w-16 h-6 text-xs"
                      min="1"
                      max="10"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="baseDelay" className="text-xs">기본 지연(ms):</Label>
                    <Input
                      id="baseDelay"
                      type="number"
                      value={reconnectConfig.baseDelay}
                      onChange={(e) => setReconnectConfig(prev => ({ ...prev, baseDelay: parseInt(e.target.value) || 1000 }))}
                      className="w-20 h-6 text-xs"
                      min="500"
                      max="5000"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="maxDelay" className="text-xs">최대 지연(ms):</Label>
                    <Input
                      id="maxDelay"
                      type="number"
                      value={reconnectConfig.maxDelay}
                      onChange={(e) => setReconnectConfig(prev => ({ ...prev, maxDelay: parseInt(e.target.value) || 30000 }))}
                      className="w-20 h-6 text-xs"
                      min="5000"
                      max="60000"
                    />
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={updateAutoReconnectConfig}
                  className="w-full text-xs"
                >
                  설정 적용
                </Button>
              </div>
            )}

            {/* 마지막 연결 시간 */}
            {lastConnectedTime && (
              <div className="text-xs text-gray-500 border-t pt-2">
                마지막 연결: {lastConnectedTime.toLocaleString()}
              </div>
            )}

            {/* 에러 메시지 */}
            {globalError && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded border-t">
                ⚠️ {globalError}
              </div>
            )}

            {/* 전체 연결 해제 버튼 */}
            {connectedCount > 0 && (
              <div className="border-t pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectWebSockets}
                  className="w-full text-xs"
                >
                  <WifiOff className="h-3 w-3 mr-1" />
                  전체 연결 해제
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// 전역 토글 버튼 컴포넌트
export const WebSocketStatusToggle: React.FC<{ onClick: () => void; isVisible: boolean }> = ({ 
  onClick, 
  isVisible 
}) => {
  const { connections, globalStatus, connectedCount, totalConnections } = useWebsocket();
  
  // WebSocket이 활성화되지 않았으면 토글 버튼도 표시하지 않음
  if (connections.length === 0 && globalStatus === 'disconnected') {
    return null;
  }
  
  const statusDisplay = globalStatus === 'connected' ? 
    { icon: <Wifi className="h-4 w-4" />, color: 'text-green-600' } :
    globalStatus === 'connecting' ?
    { icon: <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>, color: 'text-yellow-600' } :
    globalStatus === 'partial' ?
    { icon: <AlertCircle className="h-4 w-4" />, color: 'text-orange-600' } :
    { icon: <WifiOff className="h-4 w-4" />, color: 'text-gray-400' };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`fixed top-4 right-20 z-40 ${statusDisplay.color}`}
      title="WebSocket 상태 보기"
    >
      {statusDisplay.icon}
      <span className="ml-1 text-xs">{connectedCount}/{totalConnections}</span>
    </Button>
  );
};

export default GlobalWebSocketStatus; 