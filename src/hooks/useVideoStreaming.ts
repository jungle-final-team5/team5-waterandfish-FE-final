import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  StreamingConfig, 
  StreamingStats, 
  StreamingStatus, 
  DEFAULT_STREAMING_CONFIG 
} from '@/types/streaming';
import { getConnectionByUrl } from '@/hooks/useWebsocket';

interface UseVideoStreamingProps {
  connectionStatus: string;
  broadcastMessage: (data: ArrayBuffer) => boolean;
  sendMessage: (data: ArrayBuffer, connectionId?: string) => boolean;  
  onStreamReady?: (stream: MediaStream) => void;
  onStreamError?: (error: string) => void;
  connectionId: string;
}

export const useVideoStreaming = ({
  connectionStatus,
  broadcastMessage,
  sendMessage,
  onStreamReady,
  onStreamError,
  connectionId
}: UseVideoStreamingProps) => {
  // 스트리밍 상태
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingStatus, setStreamingStatus] = useState<string>('');
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [streamInfo, setStreamInfo] = useState<string>('');
  
  // 스트리밍 설정
  const [streamingConfig, setStreamingConfig] = useState<StreamingConfig>(DEFAULT_STREAMING_CONFIG);
  
  // 스트리밍 통계
  const [streamingStats, setStreamingStats] = useState<StreamingStats>({
    actualFPS: 0,
    frameDropCount: 0,
    bytesPerSecond: 0,
    totalBytesSent: 0,
    framesSent: 0,
  });
  
  // 참조
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isStreamingRef = useRef<boolean>(false);
  const lastFrameTimeRef = useRef<number>(0);
  const lastDataSentTime = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(0);

  // 프레임 캡처 함수
  const captureFrame = useCallback((currentTime: number) => {
    if (!canvasRef.current || !videoRef.current || !isStreamingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    // FPS 제어
    const targetInterval = 1000 / streamingConfig.fps;
    const timeSinceLastFrame = currentTime - lastFrameTimeRef.current;
    
    if (timeSinceLastFrame < targetInterval - 1) {
      animationFrameRef.current = requestAnimationFrame(captureFrame);
      return;
    }

    // 실제 FPS 계산
    if (lastFrameTimeRef.current > 0) {
      const actualInterval = timeSinceLastFrame;
      const currentFPS = 1000 / actualInterval;
      setStreamingStats(prev => ({
        ...prev,
        actualFPS: Math.round(currentFPS * 10) / 10
      }));
    }

    lastFrameTimeRef.current = currentTime;

    // 비디오 크기 계산
    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;
    const aspectRatio = originalWidth / originalHeight;
    
    let targetWidth = streamingConfig.maxWidth;
    let targetHeight = streamingConfig.maxHeight;
    
    if (targetWidth / targetHeight > aspectRatio) {
      targetWidth = targetHeight * aspectRatio;
    } else {
      targetHeight = targetWidth / aspectRatio;
    }

    // 캔버스 설정 및 그리기
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    context.fillStyle = 'black';
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(video, 0, 0, targetWidth, targetHeight);

    // 이미지를 바이너리로 직접 전송
    if (connectionStatus !== 'connected') return;
    
    try {
      // Canvas를 직접 ArrayBuffer로 변환 (toBlob 없이)
      const dataURL = canvas.toDataURL('image/jpeg', streamingConfig.quality);
      const base64 = dataURL.split(',')[1];
      const binaryString = atob(base64);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
      
      let success = false;
      if (connectionId) {
        // Get connection by URL to find the connectionId
        console.log('[useVideoStreaming] connectionId:', connectionId);
        if (connectionId) {
          success = sendMessage(arrayBuffer, connectionId);
        } else {
          alert(`No connection found for connectionId: ${connectionId}`);
          throw new Error(`No connection found for connectionId: ${connectionId}`);
        }
      } else {
        throw new Error('connectionId is required');
      }
      
      if (success) {
        setStreamingStats(prev => ({
          ...prev,
          framesSent: prev.framesSent + 1,
          totalBytesSent: prev.totalBytesSent + arrayBuffer.byteLength
        }));
        
        // 전송 속도 계산
        const now = Date.now();
        if (lastDataSentTime.current > 0) {
          const timeDiff = (now - lastDataSentTime.current) / 1000;
          const currentBps = arrayBuffer.byteLength / timeDiff;
          setStreamingStats(prev => ({
            ...prev,
            bytesPerSecond: Math.round(currentBps)
          }));
        }
        lastDataSentTime.current = now;
        
        setStreamingStatus(`프레임 전송 중... (${streamingStats.actualFPS}fps, ${Math.round(arrayBuffer.byteLength / 1024)}KB)`);
      } else {
        setStreamingStats(prev => ({
          ...prev,
          frameDropCount: prev.frameDropCount + 1
        }));
        setStreamingStatus('전송 실패 - 연결 확인 필요');
      }
    } catch (error) {
      console.error('Frame capture error:', error);
      setStreamingStatus('프레임 캡처 에러 발생');
    }

    // 다음 프레임 스케줄링
    if (isStreamingRef.current) {
      animationFrameRef.current = requestAnimationFrame(captureFrame);
    }
  }, [connectionStatus, broadcastMessage, streamingConfig, streamingStats.actualFPS]);

  // 스트리밍 시작
  const startStreaming = useCallback(() => {
    if (!currentStream || connectionStatus !== 'connected') {
      setStreamingStatus('스트리밍 시작 불가 - 비디오 또는 웹소켓 연결 확인 필요');
      return;
    }

    if (!videoRef.current) {
      setStreamingStatus('비디오 엘리먼트가 준비되지 않았습니다');
      return;
    }

    isStreamingRef.current = true;
    setIsStreaming(true);
    setStreamingStatus('스트리밍 시작됨');
    
    // 통계 초기화
    setStreamingStats({
      actualFPS: 0,
      frameDropCount: 0,
      bytesPerSecond: 0,
      totalBytesSent: 0,
      framesSent: 0,
    });
    
    lastFrameTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(captureFrame);
  }, [currentStream, connectionStatus, captureFrame]);

  // 스트리밍 중지
  const stopStreaming = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    isStreamingRef.current = false;
    setIsStreaming(false);
    setStreamingStatus('스트리밍 중지됨');
    
    setStreamingStats(prev => ({
      ...prev,
      actualFPS: 0,
      bytesPerSecond: 0
    }));
  }, []);

  // 스트림 설정
  const handleStreamReady = useCallback((stream: MediaStream) => {
    setCurrentStream(stream);
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      setStreamInfo(`${settings.width}×${settings.height} @ ${settings.frameRate}fps`);
    }
    onStreamReady?.(stream);
  }, [onStreamReady]);

  const handleStreamError = useCallback((error: string) => {
    console.error('Video stream error:', error);
    setCurrentStream(null);
    setStreamInfo('');
    
    if (isStreamingRef.current) {
      stopStreaming();
    }
    
    onStreamError?.(error);
  }, [stopStreaming, onStreamError]);

  // 비디오 스트림 연결
  useEffect(() => {
    if (currentStream && videoRef.current) {
      videoRef.current.srcObject = currentStream;
      
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play().catch(console.error);
        }
      };
    }
  }, [currentStream]);

  // WebSocket 연결 상태 변경 시 스트리밍 자동 중지
  useEffect(() => {
    if (isStreamingRef.current && connectionStatus === 'error') {
      stopStreaming();
      setStreamingStatus('WebSocket 연결 에러로 스트리밍 중지됨');
    }
  }, [connectionStatus, stopStreaming]);

  // 정리
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    // 상태
    isStreaming,
    streamingStatus,
    currentStream,
    streamInfo,
    streamingConfig,
    streamingStats,
    
    // 참조
    canvasRef,
    videoRef,
    
    // 함수
    startStreaming,
    stopStreaming,
    setStreamingConfig,
    handleStreamReady,
    handleStreamError,
  };
}; 