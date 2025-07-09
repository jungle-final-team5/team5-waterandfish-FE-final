import { useRef, useCallback, useEffect, useState } from 'react';
import { Holistic, Results } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';
import { LandmarksData } from '@/services/SignClassifierClient';

interface UseMediaPipeHolisticOptions {
  onLandmarks?: (landmarks: LandmarksData) => void;
  modelComplexity?: 0 | 1 | 2;
  smoothLandmarks?: boolean;
  enableSegmentation?: boolean;
  smoothSegmentation?: boolean;
  refineFaceLandmarks?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

interface UseMediaPipeHolisticReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isInitialized: boolean;
  isProcessing: boolean;
  lastLandmarks: LandmarksData | null;
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
  processFrame: () => void;
}

export const useMediaPipeHolistic = (
  options: UseMediaPipeHolisticOptions = {}
): UseMediaPipeHolisticReturn => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holisticRef = useRef<Holistic | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastLandmarks, setLastLandmarks] = useState<LandmarksData | null>(null);

  const {
    onLandmarks,
    modelComplexity = 1,
    smoothLandmarks = true,
    enableSegmentation = false,
    smoothSegmentation = true,
    refineFaceLandmarks = false,
    minDetectionConfidence = 0.5,
    minTrackingConfidence = 0.5
  } = options;

  // MediaPipe 초기화
  const initializeMediaPipe = useCallback(async () => {
    try {
      console.log('🎯 MediaPipe Holistic 초기화 중...');
      
      const holistic = new Holistic({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
        }
      });

      // MediaPipe 옵션 설정
      holistic.setOptions({
        modelComplexity,
        smoothLandmarks,
        enableSegmentation,
        smoothSegmentation,
        refineFaceLandmarks,
        minDetectionConfidence,
        minTrackingConfidence
      });

      // 결과 처리 콜백 설정
      holistic.onResults((results: Results) => {
        setIsProcessing(true);
        
        try {
          // 랜드마크 데이터 추출 및 변환
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

          // 콜백 호출
          if (onLandmarks) {
            onLandmarks(landmarksData);
          }

          // 디버그용 시각화 (옵션)
          if (canvasRef.current) {
            drawLandmarks(results);
          }

        } catch (error) {
          console.error('❌ 랜드마크 처리 실패:', error);
        } finally {
          setIsProcessing(false);
        }
      });

      holisticRef.current = holistic;
      setIsInitialized(true);
      console.log('✅ MediaPipe Holistic 초기화 완료');
      
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
    minTrackingConfidence
  ]);

  // 랜드마크 시각화 (디버그용)
  const drawLandmarks = useCallback((results: Results) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기 설정
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 비디오 프레임 그리기
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 랜드마크 그리기 (선택적)
    ctx.fillStyle = 'red';
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;

    // 포즈 랜드마크
    if (results.poseLandmarks) {
      results.poseLandmarks.forEach((landmark) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // 손 랜드마크
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

  // 컴포넌트 마운트 시 MediaPipe 초기화
  useEffect(() => {
    initializeMediaPipe();

    // 컴포넌트 언마운트 시 정리
    return () => {
      stopCamera();
      if (holisticRef.current) {
        holisticRef.current.close();
        holisticRef.current = null;
      }
      setIsInitialized(false);
    };
  }, [initializeMediaPipe, stopCamera]);

  return {
    videoRef,
    canvasRef,
    isInitialized,
    isProcessing,
    lastLandmarks,
    startCamera,
    stopCamera,
    processFrame
  };
}; 