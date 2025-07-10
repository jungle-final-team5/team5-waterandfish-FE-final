import { useRef, useCallback, useEffect, useState } from 'react';
import { Holistic, Results } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';
import { LandmarksData } from '@/services/SignClassifierClient';
import { 
  StreamingConfig, 
  StreamingStats, 
  StreamingStatus, 
  DEFAULT_STREAMING_CONFIG 
} from '@/types/streaming';

interface UseMediaPipeHolisticStreamingOptions {
  // MediaPipe 옵션
  onLandmarks?: (landmarks: LandmarksData) => void;
  modelComplexity?: 0 | 1 | 2;
  smoothLandmarks?: boolean;
  enableSegmentation?: boolean;
  smoothSegmentation?: boolean;
  refineFaceLandmarks?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  enableLogging?: boolean;
  
  // 스트리밍 옵션
  connectionStatus: string;
  broadcastMessage: (data: ArrayBuffer) => boolean;
  sendMessage: (data: ArrayBuffer, connectionId?: string) => boolean;
  onStreamReady?: (stream: MediaStream) => void;
  onStreamError?: (error: string) => void;
  connectionId: string;
}

interface UseMediaPipeHolisticStreamingReturn {
  // MediaPipe 관련
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isInitialized: boolean;
  isProcessing: boolean;
  lastLandmarks: LandmarksData | null;
  
  // 스트리밍 관련
  isStreaming: boolean;
  streamingStatus: string;
  currentStream: MediaStream | null;
  streamInfo: string;
  streamingConfig: StreamingConfig;
  streamingStats: StreamingStats;
  
  // 함수들
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
  processFrame: () => void;
  startStreaming: () => void;
  stopStreaming: () => void;
  setStreamingConfig: (config: StreamingConfig) => void;
  handleStreamReady: (stream: MediaStream) => void;
  handleStreamError: (error: string) => void;
}

export const useMediaPipeHolisticStreaming = (
  options: UseMediaPipeHolisticStreamingOptions
): UseMediaPipeHolisticStreamingReturn => {
  // MediaPipe 관련 refs
  const holisticRef = useRef<Holistic | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  
  // 스트리밍 관련 refs
  const animationFrameRef = useRef<number | null>(null);
  const isStreamingRef = useRef<boolean>(false);
  const lastFrameTimeRef = useRef<number>(0);
  const lastDataSentTime = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(0);
  
  // MediaPipe 상태
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastLandmarks, setLastLandmarks] = useState<LandmarksData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 스트리밍 상태
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingStatus, setStreamingStatus] = useState<string>('');
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [streamInfo, setStreamInfo] = useState<string>('');
  const [streamingConfig, setStreamingConfig] = useState<StreamingConfig>(DEFAULT_STREAMING_CONFIG);
  const [streamingStats, setStreamingStats] = useState<StreamingStats>({
    actualFPS: 0,
    frameDropCount: 0,
    bytesPerSecond: 0,
    totalBytesSent: 0,
    framesSent: 0,
  });

  // refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    // MediaPipe 옵션
    onLandmarks,
    modelComplexity = 1,
    smoothLandmarks = true,
    enableSegmentation = false,
    smoothSegmentation = true,
    refineFaceLandmarks = false,
    minDetectionConfidence = 0.5,
    minTrackingConfidence = 0.5,
    enableLogging = false,
    
    // 스트리밍 옵션
    connectionStatus,
    broadcastMessage,
    sendMessage,
    onStreamReady,
    onStreamError,
    connectionId
  } = options;

  // 콘솔 로그 필터링 함수
  const filterConsoleLogs = useCallback(() => {
    if (!enableLogging) {
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;
      const originalInfo = console.info;

      console.log = (...args) => {
        const message = args.join(' ');
        if (
          message.includes('GL version:') ||
          message.includes('gl_context.cc:') ||
          message.includes('I0000') ||
          message.includes('overrideMethod') ||
          message.includes('put_char') ||
          message.includes('write') ||
          message.includes('doWritev') ||
          message.includes('_fd_write') ||
          message.includes('$func') ||
          message.includes('holistic_solution_simd_wasm_bin')
        ) {
          return;
        }
        originalLog(...args);
      };

      console.warn = (...args) => {
        const message = args.join(' ');
        if (
          message.includes('GL version:') ||
          message.includes('gl_context.cc:') ||
          message.includes('I0000')
        ) {
          return;
        }
        originalWarn(...args);
      };

      console.error = originalError;
      console.info = originalInfo;

      return () => {
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        console.info = originalInfo;
      };
    }
    return () => {};
  }, [enableLogging]);

  // WebGL 지원 확인
  const checkWebGLSupport = useCallback(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (!gl) {
        console.warn('⚠️ WebGL이 지원되지 않습니다');
        return false;
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        console.log('🎮 WebGL 렌더러:', renderer);
      }

      return true;
    } catch (error) {
      console.error('❌ WebGL 지원 확인 실패:', error);
      return false;
    }
  }, []);

  // MediaPipe 초기화
  const initializeMediaPipe = useCallback(async () => {
    try {
      if (!checkWebGLSupport()) {
        throw new Error('WebGL이 지원되지 않아 MediaPipe를 초기화할 수 없습니다');
      }

      const cleanupLogs = filterConsoleLogs();
      
      console.log('🎯 MediaPipe Holistic 초기화 중...');
      console.log('📦 MediaPipe 패키지 버전 확인 중...');
      
      // MediaPipe 모듈 로드 상태 확인
      if (typeof Holistic === 'undefined') {
        throw new Error('MediaPipe Holistic 모듈을 로드할 수 없습니다');
      }
      
      // Wait for browser to be fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Ensure MediaPipe is properly loaded
      if (typeof Holistic === 'function') {
        console.log('✅ MediaPipe Holistic 함수 확인됨');
      }
      
      // Check for global MediaPipe settings
      if (typeof window !== 'undefined' && (window as any).MediaPipe) {
        console.log('✅ MediaPipe 글로벌 객체 확인됨');
      }
      
      // Try to preload MediaPipe files
      try {
        await fetch('https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/holistic_solution_simd_wasm_bin.js');
        console.log('✅ MediaPipe WASM 파일 사전 로드 성공');
      } catch (fetchError) {
        console.warn('⚠️ MediaPipe WASM 파일 사전 로드 실패:', fetchError);
      }
      
      let holistic;
      try {
        // Simple initialization without complex error handling
        holistic = new Holistic();
        console.log('✅ Holistic 생성자 호출 성공');
      } catch (constructorError) {
        console.error('❌ Holistic 생성자 오류:', constructorError);
        throw new Error(`MediaPipe Holistic 생성 실패: ${constructorError.message}`);
      }

              try {
          holistic.setOptions({
            modelComplexity,
            smoothLandmarks,
            enableSegmentation,
            smoothSegmentation,
            refineFaceLandmarks,
            minDetectionConfidence,
            minTrackingConfidence
          });
          console.log('✅ Holistic 옵션 설정 성공');
        } catch (optionsError) {
          console.error('❌ Holistic 옵션 설정 오류:', optionsError);
          throw new Error(`MediaPipe 옵션 설정 실패: ${optionsError.message}`);
        }

              try {
          holistic.onResults((results: Results) => {
            setIsProcessing(true);
            
            try {
              const landmarksData: LandmarksData = {
                pose: results.poseLandmarks 
                  ? results.poseLandmarks.map(landmark => [landmark.x, landmark.y, landmark.z])
                  : null,
                left_hand: results.leftHandLandmarks 
                  ? results.leftHandLandmarks.map(landmark => [landmark.x, landmark.y, landmark.z])
                  : null,
                right_hand: results.rightHandLandmarks 
                  ? results.rightHandLandmarks.map(landmark => [landmark.x, landmark.y, landmark.z])
                  : null
              };

              setLastLandmarks(landmarksData);

              if (onLandmarks) {
                onLandmarks(landmarksData);
              }

              if (canvasRef.current) {
                drawLandmarks(results);
              }

            } catch (error) {
              console.error('❌ 랜드마크 처리 실패:', error);
            } finally {
              setIsProcessing(false);
            }
          });
          console.log('✅ Holistic 결과 콜백 설정 성공');
        } catch (callbackError) {
          console.error('❌ Holistic 결과 콜백 설정 오류:', callbackError);
          throw new Error(`MediaPipe 결과 콜백 설정 실패: ${callbackError.message}`);
        }

      holisticRef.current = holistic;
      setIsInitialized(true);
      console.log('✅ MediaPipe Holistic 초기화 완료');
      
      setTimeout(() => {
        cleanupLogs();
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('❌ MediaPipe Holistic 초기화 실패:', error);
      setIsInitialized(false);
      return false;
    }
  }, [
    onLandmarks,
    modelComplexity,
    smoothLandmarks,
    enableSegmentation,
    smoothSegmentation,
    refineFaceLandmarks,
    minDetectionConfidence,
    minTrackingConfidence,
    filterConsoleLogs,
    checkWebGLSupport
  ]);

  // 랜드마크 시각화 (디버그용)
  const drawLandmarks = useCallback((results: Results) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'red';
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;

    if (results.poseLandmarks) {
      results.poseLandmarks.forEach((landmark) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    [results.leftHandLandmarks, results.rightHandLandmarks].forEach((handLandmarks, index) => {
      if (handLandmarks) {
        ctx.fillStyle = index === 0 ? 'green' : 'orange';
        handLandmarks.forEach((landmark) => {
          const x = landmark.x * canvas.width;
          const y = landmark.y * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    });
  }, []);

  // 프레임 캡처 및 스트리밍 함수
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
        console.log('[useMediaPipeHolisticStreaming] connectionId:', connectionId);
        success = sendMessage(arrayBuffer, connectionId);
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
  }, [connectionStatus, sendMessage, streamingConfig, streamingStats.actualFPS, connectionId]);

  // 카메라 시작
  const startCamera = useCallback(async (): Promise<boolean> => {
    if (!videoRef.current || !isInitialized || !holisticRef.current) {
      console.warn('⚠️ MediaPipe가 초기화되지 않음');
      return false;
    }

    try {
      console.log('📹 카메라 시작 중...');
      
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (holisticRef.current && videoRef.current) {
            await holisticRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });

      await camera.start();
      cameraRef.current = camera;
      
      console.log('✅ 카메라 시작됨');
      return true;
    } catch (error) {
      console.error('❌ 카메라 시작 실패:', error);
      return false;
    }
  }, [isInitialized]);

  // 카메라 정지
  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
      console.log('📹 카메라 정지됨');
    }
  }, []);

  // 수동 프레임 처리
  const processFrame = useCallback(() => {
    if (holisticRef.current && videoRef.current && videoRef.current.readyState >= 2) {
      holisticRef.current.send({ image: videoRef.current });
    }
  }, []);

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

  // 비디오 스트림 연결 및 MediaPipe 처리 시작
  useEffect(() => {
    if (currentStream && videoRef.current && isInitialized) {
      videoRef.current.srcObject = currentStream;
      
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play().catch(console.error);
          
          // MediaPipe 처리를 위한 프레임 루프 시작
          const processFrameLoop = () => {
            if (holisticRef.current && videoRef.current && videoRef.current.readyState >= 2) {
              holisticRef.current.send({ image: videoRef.current });
            }
            requestAnimationFrame(processFrameLoop);
          };
          
          processFrameLoop();
          console.log('🎯 MediaPipe 프레임 처리 루프 시작됨');
        }
      };
    }
  }, [currentStream, isInitialized]);

  // WebSocket 연결 상태 변경 시 스트리밍 자동 중지
  useEffect(() => {
    if (isStreamingRef.current && connectionStatus === 'error') {
      stopStreaming();
      setStreamingStatus('WebSocket 연결 에러로 스트리밍 중지됨');
    }
  }, [connectionStatus, stopStreaming]);

  // 컴포넌트 마운트 시 MediaPipe 초기화
  useEffect(() => {
    // Wait for DOM to be fully ready and user interaction
    const handleUserInteraction = () => {
      if (!isInitialized && !holisticRef.current) {
        initializeMediaPipe();
      }
    };

    // Try to initialize after a delay, but also on user interaction
    const initTimeout = setTimeout(handleUserInteraction, 3000);

    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });

    // 컴포넌트 언마운트 시 정리
    return () => {
      clearTimeout(initTimeout);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      stopCamera();
      stopStreaming();
      if (holisticRef.current) {
        holisticRef.current.close();
        holisticRef.current = null;
      }
      setIsInitialized(false);
    };
  }, [initializeMediaPipe, stopCamera, stopStreaming, isInitialized]);

  return {
    // MediaPipe 관련
    videoRef,
    canvasRef,
    isInitialized,
    isProcessing,
    lastLandmarks,
    
    // 스트리밍 관련
    isStreaming,
    streamingStatus,
    currentStream,
    streamInfo,
    streamingConfig,
    streamingStats,
    
    // 함수들
    startCamera,
    stopCamera,
    processFrame,
    startStreaming,
    stopStreaming,
    setStreamingConfig,
    handleStreamReady,
    handleStreamError,
  };
}; 