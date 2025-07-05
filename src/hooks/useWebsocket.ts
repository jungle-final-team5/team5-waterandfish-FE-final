import React, { useState, useEffect, createContext, useContext } from 'react';

// 전역 웹소켓 상태 타입
interface WebSocketState {
  wsList: WebSocket[];
  wsUrls: string[];
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  connectionAttempts: number;
  lastConnectedTime: Date | null;
  error: string | null;
}

// 전역 웹소켓 컨텍스트 타입
interface WebSocketContextType extends WebSocketState {
  connectToWebSockets: (urls: string[]) => WebSocket[];
  disconnectWebSockets: () => void;
  setConnectionStatus: (status: WebSocketState['connectionStatus']) => void;
  setError: (error: string | null) => void;
}

// 전역 웹소켓 상태
let globalWebSocketState: WebSocketState = {
  wsList: [],
  wsUrls: [],
  connectionStatus: 'disconnected',
  connectionAttempts: 0,
  lastConnectedTime: null,
  error: null,
};

// 상태 변경 리스너들
const stateListeners = new Set<() => void>();

// 상태 업데이트 함수
const updateGlobalState = (newState: Partial<WebSocketState>) => {
  globalWebSocketState = { ...globalWebSocketState, ...newState };
  stateListeners.forEach(listener => listener());
};

// 단일 웹소켓 연결
const connectToWebSocket = (wsUrl: string) => {
    console.log(`connecting to ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    return ws;
};

// 다중 웹소켓 연결
const connectToWebSockets = (wsUrls: string[]) => {
    const wsList = [];
    const uniqueWsUrls = [...new Set(wsUrls)];
    
    updateGlobalState({ 
      connectionStatus: 'connecting', 
      connectionAttempts: globalWebSocketState.connectionAttempts + 1,
      wsUrls: uniqueWsUrls,
      error: null
    });
    
    let connectedCount = 0;
    let errorCount = 0;
    
    for (const wsUrl of uniqueWsUrls) {
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log(`WebSocket connected: ${wsUrl}`);
          connectedCount++;
          
          if (connectedCount === uniqueWsUrls.length) {
            updateGlobalState({ 
              connectionStatus: 'connected',
              lastConnectedTime: new Date(),
              error: null
            });
          }
        };
        
        ws.onclose = (event) => {
          console.log(`WebSocket disconnected: ${wsUrl}`, event.code, event.reason);
          updateGlobalState({ connectionStatus: 'disconnected' });
        };
        
        ws.onerror = (error) => {
          console.error(`WebSocket error: ${wsUrl}`, error);
          errorCount++;
          updateGlobalState({ 
            connectionStatus: 'error',
            error: `웹소켓 연결 오류 (${errorCount}/${uniqueWsUrls.length})`
          });
        };
        
        wsList.push(ws);
    }
    
    updateGlobalState({ wsList });
    return wsList; 
};

// 웹소켓 연결 해제
const disconnectWebSockets = () => {
  globalWebSocketState.wsList.forEach((ws, index) => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
      console.log(`WebSocket ${index} disconnected`);
    }
  });
  
  updateGlobalState({
    wsList: [],
    wsUrls: [],
    connectionStatus: 'disconnected',
    lastConnectedTime: null,
    error: null
  });
};

// 커스텀 훅
const useWebsocket = (wsUrls?: string[]) => {
    const [state, setState] = useState<WebSocketState>(globalWebSocketState);

    useEffect(() => {
        const listener = () => {
            setState({ ...globalWebSocketState });
        };
        
        stateListeners.add(listener);
        
        return () => {
            stateListeners.delete(listener);
        };
    }, []);

    // wsUrls가 제공되면 자동 연결
    useEffect(() => {
        if (wsUrls && wsUrls.length > 0) {
            const uniqueWsUrls = [...new Set(wsUrls)];
            if (JSON.stringify(uniqueWsUrls) !== JSON.stringify(globalWebSocketState.wsUrls)) {
                connectToWebSockets(uniqueWsUrls);
            }
        }
    }, [wsUrls]);

    return { 
        ...state,
        connectToWebSockets,
        disconnectWebSockets,
        setConnectionStatus: (status: WebSocketState['connectionStatus']) => {
            updateGlobalState({ connectionStatus: status });
        },
        setError: (error: string | null) => {
            updateGlobalState({ error });
        }
    };
};

// 전역 웹소켓 상태 접근 함수
const getGlobalWebSocketState = () => globalWebSocketState;

export default useWebsocket;
export { connectToWebSocket, connectToWebSockets, disconnectWebSockets, getGlobalWebSocketState };