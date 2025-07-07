import React, { useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Video, Wifi, WifiOff, Play, Pause, Upload } from 'lucide-react';
import VideoInput from '@/components/VideoInput';
import useWebsocket from '@/hooks/useWebsocket';
import { useGlobalWebSocketStatus } from '@/contexts/GlobalWebSocketContext';

const LearnSession = () => {
  const { chapterId } = useParams();
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [streamInfo, setStreamInfo] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingStatus, setStreamingStatus] = useState<string>('');
  const [framesSent, setFramesSent] = useState<number>(0);
  const [streamingConfig, setStreamingConfig] = useState({
    fps: 30, // 초당 프레임 수
    quality: 0.7, // JPEG 품질 (0.1 ~ 1.0)
    maxWidth: 320, // 최대 너비
    maxHeight: 240, // 최대 높이
  });
  
  // 실제 FPS 모니터링을 위한 상태
  const [actualFPS, setActualFPS] = useState<number>(0);
  const [frameDropCount, setFrameDropCount] = useState<number>(0);
  const [bytesPerSecond, setBytesPerSecond] = useState<number>(0);
  const [totalBytesSent, setTotalBytesSent] = useState<number>(0);
  
  // 프레임 시간 추적을 위한 참조 (의존성 배열에서 제외하기 위해 ref 사용)
  const lastFrameTimeRef = useRef<number>(0);
  const lastDataSentTime = useRef<number>(0);
  
  // 비디오 시간 추적을 위한 참조
  const lastVideoTimeRef = useRef<number>(0);
  
  // Canvas 방식 참조
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // 스트리밍 상태를 ref로 관리 (클로저 문제 해결)
  const isStreamingRef = useRef<boolean>(false);
  
  // 전역 WebSocket 상태 사용
  const { connectionStatus, wsList, broadcastMessage } = useWebsocket();
  const { showStatus } = useGlobalWebSocketStatus();
  console.log('wsList', wsList);

  const handleStreamReady = (stream: MediaStream) => {
    setCurrentStream(stream);
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      setStreamInfo(`${settings.width}×${settings.height} @ ${settings.frameRate}fps`);
    }
  };

  const handleStreamError = (error: string) => {
    console.error('🔴 [handleStreamError] Video stream error:', error);
    console.log('[handleStreamError] 현재 isStreaming:', isStreaming);
    
    setCurrentStream(null);
    setStreamInfo('');
    
    if (isStreamingRef.current) {
      console.log('📹 [Video Auto Stop] 비디오 에러로 자동 중지');
      stopVideoStreaming();
    }
  };

  // 고정밀 타이밍을 위한 프레임 캡처 함수
  const captureFrame = useCallback((currentTime: number) => {
    console.log('[captureFrame] 시작 - currentTime:', currentTime, 'isStreamingRef.current:', isStreamingRef.current);
    
    // 1단계: 필수 DOM 요소 확인
    if (!canvasRef.current || !videoRef.current) {
      console.log('[captureFrame] DOM 요소 없음 - canvas:', !!canvasRef.current, 'video:', !!videoRef.current);
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    // 2단계: 비디오 데이터 및 Canvas 컨텍스트 확인
    if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('[captureFrame] 비디오 데이터 없음:', {
        hasContext: !!context,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        currentTime: video.currentTime
      });
      return;
    }

    // 3단계: 스트리밍 상태 확인 (ref 사용으로 클로저 문제 해결)
    if (!isStreamingRef.current) {
      console.log('[captureFrame] 스트리밍 중지됨 - isStreamingRef.current:', isStreamingRef.current);
      return;
    }

    console.log('[captureFrame] 모든 조건 만족 - 프레임 캡처 진행');

    // FPS 계산 및 프레임 스키핑
    const targetInterval = 1000 / streamingConfig.fps; // 목표 간격 (ms)
    const timeSinceLastFrame = currentTime - lastFrameTimeRef.current;
    
    if (timeSinceLastFrame < targetInterval - 1) {
      // 아직 시간이 안 됐으면 다음 프레임에서 다시 시도
      console.log('[captureFrame] 프레임 스키핑 - 시간 부족:', timeSinceLastFrame, '/', targetInterval);
      animationFrameRef.current = requestAnimationFrame(captureFrame);
      return;
    }

    // 실제 FPS 계산
    if (lastFrameTimeRef.current > 0) {
      const actualInterval = timeSinceLastFrame;
      const currentFPS = 1000 / actualInterval;
      setActualFPS(Math.round(currentFPS * 10) / 10); // 소수점 1자리
    }

    lastFrameTimeRef.current = currentTime;

    // 원본 비디오 크기
    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;
    
    // 비율을 유지하면서 최대 크기에 맞게 조정
    const aspectRatio = originalWidth / originalHeight;
    let targetWidth = streamingConfig.maxWidth;
    let targetHeight = streamingConfig.maxHeight;
    
    if (targetWidth / targetHeight > aspectRatio) {
      targetWidth = targetHeight * aspectRatio;
    } else {
      targetHeight = targetWidth / aspectRatio;
    }

    // 캔버스 크기 설정
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // 비디오가 일시정지 상태라면 재생 시작
    if (video.paused) {
      console.log('[captureFrame] 비디오가 일시정지 상태 - 재생 시작');
      video.play().catch(e => {
        console.error('[captureFrame] 비디오 재생 실패:', e);
      });
    }
    
    // 비디오 시간 변화 감지
    const currentVideoTime = video.currentTime;
    const videoTimeChanged = Math.abs(currentVideoTime - lastVideoTimeRef.current) > 0.001;
    console.log('[captureFrame] 비디오 시간 변화:', {
      currentTime: currentVideoTime,
      lastTime: lastVideoTimeRef.current,
      changed: videoTimeChanged,
      timeDiff: currentVideoTime - lastVideoTimeRef.current
    });
    lastVideoTimeRef.current = currentVideoTime;
    
    // Canvas를 먼저 검은색으로 초기화
    context.fillStyle = 'black';
    context.fillRect(0, 0, targetWidth, targetHeight);
    
    context.drawImage(video, 0, 0, targetWidth, targetHeight);
    
    // Canvas 내용 확인 (픽셀 데이터 샘플링)
    const imageData = context.getImageData(0, 0, Math.min(targetWidth, 10), Math.min(targetHeight, 10));
    const pixelSum = imageData.data.reduce((sum, val) => sum + val, 0);
    const rgbSample = [];
    for (let i = 0; i < Math.min(12, imageData.data.length); i += 4) {
      rgbSample.push([imageData.data[i], imageData.data[i+1], imageData.data[i+2]]);
    }
    console.log('[captureFrame] Canvas 픽셀 데이터 샘플:', {
      totalPixels: imageData.data.length,
      pixelSum: pixelSum,
      averageValue: pixelSum / imageData.data.length,
      isBlack: pixelSum === 0,
      isWhite: pixelSum === imageData.data.length * 255,
      rgbSample: rgbSample
    });

    // 캔버스를 blob으로 변환하여 웹소켓으로 전송
    console.log('[captureFrame] toBlob 시작 - 품질:', streamingConfig.quality);
    canvas.toBlob((blob) => {
      console.log('[captureFrame] toBlob 콜백 호출됨');
      
      if (!blob) {
        console.error('[captureFrame] blob 생성 실패 - null');
        return;
      }
      
      console.log('[captureFrame] blob 생성 성공:', {
        size: blob.size,
        type: blob.type
      });
      
      if (connectionStatus !== 'connected') {
        console.log('[captureFrame] 연결 상태 불량 - connectionStatus:', connectionStatus);
        return;
      }
      
      // Blob을 다시 이미지로 변환해서 확인 (디버깅용)
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const debugCanvas = document.createElement('canvas');
          debugCanvas.width = 50;
          debugCanvas.height = 50;
          const debugCtx = debugCanvas.getContext('2d');
          if (debugCtx) {
            debugCtx.drawImage(img, 0, 0, 50, 50);
            const debugImageData = debugCtx.getImageData(0, 0, 10, 10);
            const debugPixelSum = debugImageData.data.reduce((sum, val) => sum + val, 0);
            const debugRgbSample = [];
            for (let i = 0; i < Math.min(12, debugImageData.data.length); i += 4) {
              debugRgbSample.push([debugImageData.data[i], debugImageData.data[i+1], debugImageData.data[i+2]]);
            }
            console.log('[captureFrame] Blob 내용 검증:', {
              debugPixelSum: debugPixelSum,
              debugRgbSample: debugRgbSample,
              isWhite: debugPixelSum === debugImageData.data.length * 255
            });
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(blob);
      
      console.log('[captureFrame] broadcastMessage 시작 - 크기:', blob.size, 'bytes');
      const success = broadcastMessage(blob);
      console.log('[captureFrame] broadcastMessage 결과:', success);
      
      if (success) {
        setFramesSent(prev => prev + 1);
        setTotalBytesSent(prev => prev + blob.size);
        
        // 전송 속도 계산
        const now = Date.now();
        if (lastDataSentTime.current > 0) {
          const timeDiff = (now - lastDataSentTime.current) / 1000; // 초
          const bytesDiff = blob.size;
          const currentBps = bytesDiff / timeDiff;
          setBytesPerSecond(Math.round(currentBps));
        }
        lastDataSentTime.current = now;
        
        console.log('[captureFrame] 전송 성공 - 크기:', Math.round(blob.size / 1024), 'KB');
        setStreamingStatus(`프레임 전송 중... (실제 FPS: ${actualFPS}, ${Math.round(blob.size / 1024)}KB)`);
      } else {
        console.log('[captureFrame] 전송 실패');
        setStreamingStatus('전송 실패 - 연결 확인 필요');
        setFrameDropCount(prev => prev + 1);
      }
    }, 'image/jpeg', streamingConfig.quality);

    // 다음 프레임 스케줄링 (ref 사용으로 클로저 문제 해결)
    if (isStreamingRef.current) {
      console.log('[captureFrame] 다음 프레임 스케줄링');
      animationFrameRef.current = requestAnimationFrame(captureFrame);
    } else {
      console.log('[captureFrame] 스트리밍 중지됨 - 다음 프레임 스케줄링 안함');
    }
  }, [connectionStatus, broadcastMessage, streamingConfig, actualFPS]);

  // Canvas 기반 비디오 스트리밍 시작
  const startVideoStreaming = useCallback(() => {
    console.log('🚀 [startVideoStreaming] 스트리밍 시작 시도');
    console.log('[startVideoStreaming] currentStream:', !!currentStream);
    console.log('[startVideoStreaming] connectionStatus:', connectionStatus);
    console.log('[startVideoStreaming] wsList.length:', wsList.length);
    
    if (!currentStream || connectionStatus !== 'connected') {
      console.log('[startVideoStreaming] 시작 조건 불만족');
      setStreamingStatus('스트리밍 시작 불가 - 비디오 또는 웹소켓 연결 확인 필요');
      return;
    }

    if (!videoRef.current) {
      console.log('[startVideoStreaming] 비디오 엘리먼트 없음');
      setStreamingStatus('비디오 엘리먼트가 준비되지 않았습니다');
      return;
    }

    console.log('✅ [startVideoStreaming] 스트리밍 시작 조건 만족');
    
    // 스트리밍 시작 - ref와 state 동시 업데이트
    isStreamingRef.current = true;
    setIsStreaming(true);
    setStreamingStatus('스트리밍 시작됨');
    setFramesSent(0);
    setFrameDropCount(0);
    setTotalBytesSent(0);
    lastFrameTimeRef.current = 0;
    
    console.log('[startVideoStreaming] requestAnimationFrame 시작');
    console.log('[startVideoStreaming] isStreamingRef.current:', isStreamingRef.current);
    
    // 첫 번째 프레임 캡처 시작
    animationFrameRef.current = requestAnimationFrame(captureFrame);
    
  }, [currentStream, connectionStatus, captureFrame, wsList.length]);

  // 비디오 스트리밍 중지
  const stopVideoStreaming = useCallback(() => {
    console.log('🛑 [stopVideoStreaming] 스트리밍 중지 시작');
    console.log('[stopVideoStreaming] 호출 스택:', new Error().stack);
    
    // requestAnimationFrame 정리
    if (animationFrameRef.current) {
      console.log('[stopVideoStreaming] requestAnimationFrame 정리');
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    console.log('[stopVideoStreaming] isStreaming을 false로 설정');
    // ref와 state 동시 업데이트
    isStreamingRef.current = false;
    setIsStreaming(false);
    setStreamingStatus('스트리밍 중지됨');
    setActualFPS(0);
    setBytesPerSecond(0);
  }, []);

  // 비디오 스트림을 비디오 엘리먼트에 연결
  React.useEffect(() => {
    if (currentStream && videoRef.current) {
      console.log('🎬 [Video Stream] 비디오 엘리먼트에 스트림 연결');
      videoRef.current.srcObject = currentStream;
      
      // 메타데이터 로드 후 재생 시작
      videoRef.current.onloadedmetadata = () => {
        console.log('🎬 [Video Stream] 메타데이터 로드 완료 - 재생 시작');
        if (videoRef.current) {
          videoRef.current.play().then(() => {
            console.log('🎬 [Video Stream] 비디오 재생 시작됨');
          }).catch((e) => {
            console.error('🎬 [Video Stream] 비디오 재생 실패:', e);
          });
        }
      };
    }
  }, [currentStream]);

  // WebSocket 연결 상태 변경 시 스트리밍 자동 중지
  React.useEffect(() => {
    console.log('[WebSocket useEffect] connectionStatus:', connectionStatus, 'isStreaming:', isStreaming);
    
    // 'error' 상태일 때만 중지 (connecting 상태에서는 중지하지 않음)
    if (isStreamingRef.current && connectionStatus === 'error') {
      console.log('🔥 [WebSocket Auto Stop] WebSocket 에러로 자동 중지');
      stopVideoStreaming();
      setStreamingStatus('WebSocket 연결 에러로 스트리밍 중지됨');
    }
  }, [connectionStatus, isStreaming, stopVideoStreaming]);

  // isStreaming 상태 변경 모니터링
  React.useEffect(() => {
    console.log('📊 [isStreaming Monitor] isStreaming 상태 변경:', isStreaming);
    console.log('📊 [isStreaming Monitor] isStreamingRef.current:', isStreamingRef.current);
  }, [isStreaming]);

  // connectionStatus 상태 변경 모니터링
  React.useEffect(() => {
    console.log('🔌 [connectionStatus Monitor] connectionStatus 상태 변경:', connectionStatus);
  }, [connectionStatus]);

  // 컴포넌트 언마운트 시 정리
  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
            
            {/* 스트리밍 컨트롤 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => {
                    if (isStreaming) {
                      console.log('🔴 [UI Button] 사용자가 스트리밍 중지 버튼 클릭');
                      stopVideoStreaming();
                    } else {
                      console.log('🟢 [UI Button] 사용자가 스트리밍 시작 버튼 클릭');
                      startVideoStreaming();
                    }
                  }}
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
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium">FPS:</label>
                <select
                  value={streamingConfig.fps}
                  onChange={(e) => setStreamingConfig(prev => ({ ...prev, fps: Number(e.target.value) }))}
                  disabled={isStreaming}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value={10}>10fps (저품질)</option>
                  <option value={15}>15fps (중품질)</option>
                  <option value={20}>20fps (고품질)</option>
                  <option value={30}>30fps (최고품질)</option>
                </select>
                
                <label className="text-sm font-medium">JPEG 품질:</label>
                <select
                  value={streamingConfig.quality}
                  onChange={(e) => setStreamingConfig(prev => ({ ...prev, quality: Number(e.target.value) }))}
                  disabled={isStreaming}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value={0.3}>0.3 (저품질)</option>
                  <option value={0.5}>0.5 (중품질)</option>
                  <option value={0.7}>0.7 (고품질)</option>
                  <option value={0.9}>0.9 (최고품질)</option>
                </select>
                
                <label className="text-sm font-medium">해상도:</label>
                <select
                  value={`${streamingConfig.maxWidth}x${streamingConfig.maxHeight}`}
                  onChange={(e) => {
                    const [width, height] = e.target.value.split('x').map(Number);
                    setStreamingConfig(prev => ({ ...prev, maxWidth: width, maxHeight: height }));
                  }}
                  disabled={isStreaming}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="160x120">160×120 (저해상도)</option>
                  <option value="320x240">320×240 (중해상도)</option>
                  <option value="640x480">640×480 (고해상도)</option>
                </select>
              </div>
            </div>
            
            {/* 숨겨진 요소들 */}
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
                  <div className="flex justify-between">
                    <span className="font-medium">스트리밍 상태:</span>
                    <span className={isStreaming ? 'text-green-600' : 'text-gray-500'}>
                      {isStreaming ? '전송 중' : '대기 중'}
                    </span>
                  </div>
                  {streamInfo && (
                    <div className="flex justify-between">
                      <span className="font-medium">스트림 정보:</span>
                      <span className="text-sm">{streamInfo}</span>
                    </div>
                  )}
                  {streamingStatus && (
                    <div className="flex justify-between">
                      <span className="font-medium">전송 상태:</span>
                      <span className="text-sm">{streamingStatus}</span>
                    </div>
                  )}
                  {isStreaming && (
                    <div className="flex justify-between">
                      <span className="font-medium">전송 프레임:</span>
                      <span className="text-sm">{framesSent}개</span>
                    </div>
                  )}
                  {isStreaming && (
                    <div className="flex justify-between">
                      <span className="font-medium">품질 설정:</span>
                      <span className="text-sm">{streamingConfig.maxWidth}×{streamingConfig.maxHeight} @ {streamingConfig.fps}fps (품질: {streamingConfig.quality})</span>
                    </div>
                  )}
                  {isStreaming && (
                    <div className="flex justify-between">
                      <span className="font-medium">전송 속도:</span>
                      <span className={`text-sm ${bytesPerSecond > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        {bytesPerSecond > 0 ? `${Math.round(bytesPerSecond / 1024)}KB/s` : '측정 중...'}
                      </span>
                    </div>
                  )}
                  {isStreaming && (
                    <div className="flex justify-between">
                      <span className="font-medium">총 전송량:</span>
                      <span className="text-sm">{Math.round(totalBytesSent / 1024)}KB</span>
                    </div>
                  )}
                  {isStreaming && frameDropCount > 0 && (
                    <div className="flex justify-between">
                      <span className="font-medium">전송 실패:</span>
                      <span className="text-sm text-red-600">{frameDropCount}회</span>
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
                  
                  {/* 스트리밍 상태 표시 */}
                  {currentStream && (
                    <div className={`p-4 rounded-lg ${
                      isStreaming ? 'bg-green-50' : 'bg-blue-50'
                    }`}>
                      <p className={`font-medium ${
                        isStreaming ? 'text-green-800' : 'text-blue-800'
                      }`}>
                        {isStreaming ? '📡' : '📹'} 비디오 스트리밍 {isStreaming ? '전송 중' : '대기 중'}
                      </p>
                      <p className={`text-sm mt-1 ${
                        isStreaming ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {isStreaming 
                          ? `Canvas 방식으로 비디오를 ${wsList.length}개 서버로 실시간 전송하고 있습니다. (${Math.round(bytesPerSecond / 1024)}KB/s)`
                          : '스트리밍을 시작하려면 "스트리밍 시작" 버튼을 클릭하세요.'
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
                    <div className={`w-2 h-2 rounded-full ${
                      isStreaming ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <span className={
                      isStreaming ? 'text-green-600' : 'text-gray-500'
                    }>
                      Canvas 비디오 스트리밍 {isStreaming ? '(활성)' : '(대기 중)'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600">
                      Canvas API (안정적)
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

export default LearnSession;
