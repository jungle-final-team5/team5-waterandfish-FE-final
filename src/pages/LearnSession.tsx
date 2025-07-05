import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Video, Wifi, WifiOff } from 'lucide-react';
import VideoInput from '@/components/VideoInput';
import useWebsocket from '@/hooks/useWebsocket';
import { useGlobalWebSocketStatus } from '@/contexts/GlobalWebSocketContext';

const WordSession = () => {
  const { chapterId } = useParams();
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [streamInfo, setStreamInfo] = useState<string>('');
  
  // 전역 WebSocket 상태 사용
  const { connectionStatus, wsList } = useWebsocket();
  const { showStatus } = useGlobalWebSocketStatus();

  const handleStreamReady = (stream: MediaStream) => {
    setCurrentStream(stream);
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      setStreamInfo(`${settings.width}×${settings.height} @ ${settings.frameRate}fps`);
    }
  };

  const handleStreamError = (error: string) => {
    console.error('Video stream error:', error);
    setCurrentStream(null);
    setStreamInfo('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로가기
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">단어 학습 세션</h1>
          </div>
          
          {/* WebSocket 상태 표시 */}
          {wsList.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={showStatus}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 비디오 입력 영역 */}
          <div>
            <VideoInput
              width={640}
              height={480}
              autoStart={false}
              showControls={true}
              onStreamReady={handleStreamReady}
              onStreamError={handleStreamError}
              className="h-full"
            />
          </div>
        
          {/* 정보 패널 */}
          <div className="space-y-6">
            {/* 페이지 정보 */}
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
                    <span>WordSession.tsx</span>
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
                  {streamInfo && (
                    <div className="flex justify-between">
                      <span className="font-medium">스트림 정보:</span>
                      <span className="text-sm">{streamInfo}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 상태 표시 */}
            <Card>
              <CardHeader>
                <CardTitle>시스템 상태</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-green-800 font-medium">
                      ✅ 라우팅 정상 작동
                    </p>
                    <p className="text-green-600 text-sm mt-1">
                      WordSession 페이지가 성공적으로 로드되었습니다.
                    </p>
                  </div>
                  
                  <div className={`p-4 rounded-lg ${
                    currentStream ? 'bg-green-50' : 'bg-yellow-50'
                  }`}>
                    <p className={`font-medium ${
                      currentStream ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      {currentStream ? '✅' : '⚠️'} 비디오 입력 {currentStream ? '연결됨' : '대기 중'}
                    </p>
                    <p className={`text-sm mt-1 ${
                      currentStream ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {currentStream 
                        ? '카메라가 정상적으로 연결되어 비디오 스트림을 수신하고 있습니다.'
                        : '카메라 연결을 시작하려면 "시작" 버튼을 클릭하세요.'
                      }
                    </p>
                  </div>
                  
                  {/* WebSocket 상태 표시 */}
                  {wsList.length > 0 && (
                    <div className={`p-4 rounded-lg ${
                      connectionStatus === 'connected' ? 'bg-green-50' : 
                      connectionStatus === 'connecting' ? 'bg-yellow-50' : 'bg-red-50'
                    }`}>
                      <p className={`font-medium ${
                        connectionStatus === 'connected' ? 'text-green-800' : 
                        connectionStatus === 'connecting' ? 'text-yellow-800' : 'text-red-800'
                      }`}>
                        {connectionStatus === 'connected' ? '✅' : 
                         connectionStatus === 'connecting' ? '⚠️' : '❌'} 
                        WebSocket {connectionStatus === 'connected' ? '연결됨' : 
                                   connectionStatus === 'connecting' ? '연결 중' : '연결 안됨'}
                      </p>
                      <p className={`text-sm mt-1 ${
                        connectionStatus === 'connected' ? 'text-green-600' : 
                        connectionStatus === 'connecting' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {connectionStatus === 'connected' 
                          ? `${wsList.length}개 서버에 연결되어 실시간 통신이 가능합니다.`
                          : connectionStatus === 'connecting'
                          ? '서버에 연결을 시도하고 있습니다...'
                          : '서버 연결에 실패했습니다. 새로고침 후 다시 시도해주세요.'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 기능 안내 */}
            <Card>
              <CardHeader>
                <CardTitle>사용 가능한 기능</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>실시간 비디오 스트림 입력</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>다중 카메라 장치 지원</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>자동 해상도 및 FPS 조정</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>에러 처리 및 상태 모니터링</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <span className={
                      connectionStatus === 'connected' ? 'text-green-600' : 'text-gray-500'
                    }>
                      WebSocket 실시간 통신 {connectionStatus === 'connected' ? '(활성)' : '(비활성)'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-gray-500">수어 인식 (향후 추가 예정)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordSession;
