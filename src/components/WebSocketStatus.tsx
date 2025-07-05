import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Activity, 
  Server, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import useWebsocket, { connectToWebSockets, disconnectWebSockets } from '@/hooks/useWebsocket';

// 웹소켓 상태 프로퍼티 인터페이스
interface WebSocketStatusProps { 
  chapterId?: string; // 챕터 ID
  wsUrls?: string[]; // 웹소켓 URL 목록
  onConnectionChange?: (isConnected: boolean) => void; // 연결 상태 변경 콜백
  className?: string; // 카드 클래스 이름
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = ({
  chapterId, // 챕터 ID
  wsUrls = [], // 웹소켓 URL 목록
  onConnectionChange, // 연결 상태 변경 콜백
  className = "" // 카드 클래스 이름
}) => {
  // 전역 웹소켓 상태 사용
  const {
    wsList, // 웹소켓 연결 목록
    wsUrls: globalWsUrls, // 전역 웹소켓 URL 목록
    connectionStatus, // 연결 상태
    connectionAttempts, // 연결 시도 횟수
    lastConnectedTime, // 마지막 연결 시간
    error, // 오류 메시지
    connectToWebSockets: globalConnectToWebSockets, // 전역 웹소켓 연결 함수
    disconnectWebSockets: globalDisconnectWebSockets, // 전역 웹소켓 연결 해제 함수
    setError // 오류 메시지 설정 함수
  } = useWebsocket();


  // 웹소켓 연결 해제
  const disconnectWebSockets = () => {
    globalDisconnectWebSockets(); // 전역 연결 해제 함수 사용
    
    if (onConnectionChange) { // 연결 상태 변경 콜백이 있으면
      onConnectionChange(false); // 연결 상태 변경 콜백 호출
    }
  };

  // 상태에 따른 아이콘 반환
  const getStatusIcon = () => {
    switch (connectionStatus) { // 연결 상태에 따른 아이콘 반환
      case 'connected': // 연결됨
        return <CheckCircle className="h-4 w-4 text-green-600" />; // 체크 아이콘
      case 'connecting': // 연결 중
        return <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />; // 시계 아이콘
      case 'error': // 오류
        return <XCircle className="h-4 w-4 text-red-600" />; // 오류 아이콘
      default: // 기본
        return <WifiOff className="h-4 w-4 text-gray-400" />; // 와이파이 아이콘
    }
  };

  // 상태에 따른 배지 색상
  const getStatusBadge = () => {
    switch (connectionStatus) { // 연결 상태에 따른 배지 색상 반환
      case 'connected': // 연결됨
        return <Badge className="bg-green-500 text-white">연결됨</Badge>; // 배지 색상
      case 'connecting': // 연결 중
        return <Badge className="bg-yellow-500 text-white">연결 중</Badge>; // 배지 색상
      case 'error': // 오류
        return <Badge className="bg-red-500 text-white">오류</Badge>; // 배지 색상
      default: // 기본
        return <Badge variant="secondary">연결 안됨</Badge>; //
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>웹소켓 연결 상태</span>
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* 에러 메시지 */}
        {error && (
          <Alert className="mb-4 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* 연결 정보 */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span>상태:</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className="capitalize">{connectionStatus}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>서버 수:</span>
              <span>{wsList.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>연결 주소:</span>
              <div className="text-xs text-gray-600 max-w-32 truncate">
                {wsList.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {wsList.map((ws, index) => (
                      <li key={index} className="text-xs">{ws.url}</li>
                    ))}
                  </ul>
                ) : (
                  '연결된 서버 없음'
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>연결 시도:</span>
              <span>{connectionAttempts}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>활성 연결:</span>
                             <span className="text-green-600">
                 {wsList.filter(ws => ws.readyState === WebSocket.OPEN).length}
               </span>
            </div>
          </div>

          {/* 마지막 연결 시간 */}
          {lastConnectedTime && (
            <div className="text-xs text-gray-500">
              마지막 연결: {lastConnectedTime.toLocaleString()}
            </div>
          )}

          {/* 서버 목록 */}
          {wsUrls.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <Server className="h-4 w-4 mr-1" />
                서버 목록
              </h4>
              <div className="space-y-1">
                {wsUrls.map((url, index) => {
                                     const ws = wsList[index];
                  const isConnected = ws && ws.readyState === WebSocket.OPEN;
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                    >
                      <span className="font-mono truncate flex-1 mr-2">{url}</span>
                      <div className="flex items-center space-x-1">
                        {isConnected ? (
                          <Wifi className="h-3 w-3 text-green-600" />
                        ) : (
                          <WifiOff className="h-3 w-3 text-gray-400" />
                        )}
                        <span className={isConnected ? 'text-green-600' : 'text-gray-400'}>
                          {isConnected ? '연결됨' : '연결 안됨'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 컨트롤 버튼 */}
          <div className="flex space-x-2 pt-4">
            {connectionStatus === 'connected' ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={disconnectWebSockets}
                className="flex-1"
              >
                <WifiOff className="h-4 w-4 mr-2" />
                연결 해제
              </Button>
            ) :     null}
            
                         <Button
               variant="outline"
               size="sm"
               onClick={() => setError(null)}
             >
               <RefreshCw className="h-4 w-4" />
             </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebSocketStatus; 