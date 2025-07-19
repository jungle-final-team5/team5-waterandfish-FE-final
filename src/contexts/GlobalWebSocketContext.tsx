import React, { createContext, useContext, useState, useEffect } from 'react';
import GlobalWebSocketStatus, { WebSocketStatusToggle } from '@/components/GlobalWebSocketStatus';
import useWebsocket from '@/hooks/useWebsocket';

interface GlobalWebSocketContextType {
  isStatusVisible: boolean;
  showStatus: () => void;
  hideStatus: () => void;
  toggleStatus: () => void;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  setPosition: (position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left') => void;
  isAutoShow: boolean;
  setAutoShow: (autoShow: boolean) => void;
  connectedCount: number;
  totalCount: number;
}

const GlobalWebSocketContext = createContext<GlobalWebSocketContextType | undefined>(undefined);

export const useGlobalWebSocketStatus = () => {
  const context = useContext(GlobalWebSocketContext);
  if (!context) {
    throw new Error('useGlobalWebSocketStatus must be used within a GlobalWebSocketProvider');
  }
  return context;
};

interface GlobalWebSocketProviderProps {
  children: React.ReactNode;
  defaultPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoShowOnConnection?: boolean;
  showToggleButton?: boolean;
}

export const GlobalWebSocketProvider: React.FC<GlobalWebSocketProviderProps> = ({
  children,
  defaultPosition = 'top-right',
  autoShowOnConnection = false,
  showToggleButton = true
}) => {
  const [isStatusVisible, setIsStatusVisible] = useState(false);
  const [position, setPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>(defaultPosition);
  const [isAutoShow, setAutoShow] = useState(autoShowOnConnection);
  
  // WebSocket 상태 모니터링
  const { connectionStatus, wsList, connectedCount, totalConnections } = useWebsocket();

  // WebSocket 연결 시 자동으로 상태 표시
  useEffect(() => {
    if (isAutoShow && connectionStatus === 'connected' && wsList.length > 0) {
      setIsStatusVisible(false);
    }
  }, [connectionStatus, wsList.length, isAutoShow]);

  // 컨텍스트 메서드들
  const showStatus = () => setIsStatusVisible(false);
  const hideStatus = () => setIsStatusVisible(false);
  const toggleStatus = () => setIsStatusVisible(!isStatusVisible);

  const contextValue: GlobalWebSocketContextType = {
    isStatusVisible,
    showStatus,
    hideStatus,
    toggleStatus,
    position,
    setPosition,
    isAutoShow,
    setAutoShow,
    connectedCount,
    totalCount: totalConnections
  };

  return (
    <GlobalWebSocketContext.Provider value={contextValue}>
      {children}
      
      {/* 전역 토글 버튼 */}
      {showToggleButton && (
        <WebSocketStatusToggle
          onClick={toggleStatus}
          isVisible={isStatusVisible}
        />
      )}
      
      {/* 전역 WebSocket 상태 표시 */}
      {isStatusVisible && (
        <GlobalWebSocketStatus
          position={position}
          showByDefault={true}
          allowMinimize={true}
        />
      )}
    </GlobalWebSocketContext.Provider>
  );
};

export default GlobalWebSocketProvider; 