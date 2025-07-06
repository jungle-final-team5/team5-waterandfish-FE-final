import { useState, useRef, useCallback, useEffect } from 'react';

export interface VideoStreamState {
  isStreaming: boolean;
  error: string | null;
  stream: MediaStream | null;
}

export const useVideoStream = () => {
  
  // 훅 1. state 관리
  const [state, setState] = useState<VideoStreamState>({
    isStreaming: false,
    error: null,
    stream: null
  });
  
  // 훅 2. 비디오 참조
  const videoRef = useRef<HTMLVideoElement>(null);

  // 훅 3. 캔버스 참조
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 훅 4. 스트림 참조
  const streamRef = useRef<MediaStream | null>(null);

  // 훅 5. 스트림 시작 함수
  const startStream = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setState({
        isStreaming: true,
        error: null,
        stream
      });
      
      console.log('✅ 비디오 스트림 시작됨');
      console.log('실제 설정된 stream:', stream);
      console.log('streamRef.current:', streamRef.current);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      setState(prev => ({
        ...prev,
        error: `비디오 스트림 시작 실패: ${errorMessage}`,
        isStreaming: false
      }));
      console.error('❌ 비디오 스트림 시작 실패:', error);
    }
  }, []);

  // 훅 6. 스트림 중지 함수
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setState({
      isStreaming: false,
      error: null,
      stream: null
    });
    
    console.log('🛑 비디오 스트림 종료됨');
  }, []);

  // 훅 7. 프레임 캡처 함수
  const captureFrameAsync = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current || !canvasRef.current || !state.isStreaming) {
      return null;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('❌ Canvas 컨텍스트를 가져올 수 없음');
        return null;
      }

      // 비디오 크기에 맞춰 캔버스 크기 설정
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // 현재 비디오 프레임을 캔버스에 그리기
      ctx.drawImage(video, 0, 0);
      
      // 캔버스를 Blob으로 변환
      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.8);
      });
      
    } catch (error) {
      console.error('❌ 프레임 캡처 실패:', error);
      return null;
    }
  }, [state.isStreaming]);

  // 훅 8. 비디오 스트림 상태 변경 추적
  useEffect(() => {
    console.log('📊 VideoStream state 변경됨:', {
      isStreaming: state.isStreaming,
      hasError: !!state.error,
      hasStream: !!state.stream,
      streamId: state.stream?.id || 'null'
    });
  }, [state]);

  // 훅 9. 컴포넌트 언마운트 시 스트림 중지
  useEffect(() => {
    // 언마운트 루틴. -> useVideoStream 훅이 사용되는 컴포넌트가 언마운트될 때 실행됨
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    videoRef,
    canvasRef,
    state,
    startStream,
    stopStream,
    captureFrameAsync
  };
}; 