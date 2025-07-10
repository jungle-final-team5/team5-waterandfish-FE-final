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
  enableLogging?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface UseMediaPipeHolisticReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isInitialized: boolean;
  isProcessing: boolean;
  lastLandmarks: LandmarksData | null;
  error: string | null;
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
  processFrame: () => void;
  retryInitialization: () => Promise<boolean>;
}

// MediaPipe 모듈 로딩 상태 추적
let mediaPipeLoadPromise: Promise<boolean> | null = null;
let mediaPipeLoadAttempts = 0;
const MAX_GLOBAL_RETRIES = 5; // 증가

// CDN URL 목록 (대체 CDN 포함)
const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/holistic',
  'https://unpkg.com/@mediapipe/holistic',
  'https://cdnjs.cloudflare.com/ajax/libs/mediapipe-holistic'
];

// 전역 MediaPipe 객체 확인
const checkGlobalMediaPipe = (): boolean => {
  try {
    // window 객체에 MediaPipe가 있는지 확인
    if (typeof window !== 'undefined' && (window as any).MediaPipe) {
      console.log('✅ 전역 MediaPipe 객체 발견');
      return true;
    }
    
    // require나 import로 로드된 모듈 확인
    if (typeof require !== 'undefined') {
      try {
        const mediapipe = require('@mediapipe/holistic');
        if (mediapipe && mediapipe.Holistic) {
          console.log('✅ require로 MediaPipe 모듈 발견');
          return true;
        }
      } catch (e) {
        // require 실패는 정상
      }
    }
    
    return false;
  } catch (error) {
    console.warn('⚠️ 전역 MediaPipe 확인 실패:', error);
    return false;
  }
};

// 스크립트 태그를 통한 MediaPipe 로딩
const loadMediaPipeViaScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // 이미 로드되어 있는지 확인
    if (typeof window !== 'undefined' && (window as any).MediaPipe) {
      console.log('✅ MediaPipe가 이미 로드되어 있음');
      resolve(true);
      return;
    }
    
    // 스크립트 태그 생성
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/holistic.js';
    script.async = true;
    
    script.onload = () => {
      console.log('✅ MediaPipe 스크립트 로드 성공');
      resolve(true);
    };
    
    script.onerror = () => {
      console.error('❌ MediaPipe 스크립트 로드 실패');
      resolve(false);
    };
    
    document.head.appendChild(script);
  });
};

// CDN 접근성 확인
const checkCDNAccessibility = async (): Promise<string | null> => {
  for (const cdnUrl of CDN_URLS) {
    try {
      const response = await fetch(`${cdnUrl}/holistic_solution_simd_wasm_bin.js`, {
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        console.log(`✅ CDN 접근 가능: ${cdnUrl}`);
        return cdnUrl;
      }
    } catch (error) {
      console.warn(`⚠️ CDN 접근 실패: ${cdnUrl}`, error);
    }
  }
  
  console.error('❌ 모든 CDN 접근 실패');
  return null;
};

// MediaPipe 모듈 로딩 함수
const loadMediaPipeModule = async (): Promise<boolean> => {
  try {
    console.log('📦 MediaPipe 모듈 로딩 시작...');
    
    // 전역 MediaPipe 확인
    if (checkGlobalMediaPipe()) {
      console.log('✅ 전역 MediaPipe 사용 가능');
      return true;
    }
    
    // 스크립트 태그를 통한 로딩 시도
    console.log('📥 MediaPipe 스크립트 태그 로딩 시도...');
    const scriptLoaded = await loadMediaPipeViaScript();
    if (scriptLoaded && checkGlobalMediaPipe()) {
      console.log('✅ 스크립트 태그를 통한 MediaPipe 로딩 성공');
      return true;
    }
    
    // CDN 접근성 확인
    const accessibleCDN = await checkCDNAccessibility();
    if (!accessibleCDN) {
      throw new Error('MediaPipe CDN에 접근할 수 없습니다');
    }

    // 동적 import로 MediaPipe 모듈 로드 (최후의 수단)
    console.log('📥 MediaPipe 모듈 동적 import 시도...');
    const mediapipeModule = await import('@mediapipe/holistic');
    
    // 모듈 구조 확인
    console.log('🔍 MediaPipe 모듈 구조 확인:', Object.keys(mediapipeModule));
    
    // 다양한 방식으로 Holistic 생성자 찾기
    let Holistic: any = null;
    
    // 1. 직접 export 확인
    if (mediapipeModule.Holistic) {
      Holistic = mediapipeModule.Holistic;
      console.log('✅ 직접 export에서 Holistic 발견');
    }
    // 2. default export 확인
    else if (mediapipeModule.default) {
      console.log('🔍 default export 확인:', typeof mediapipeModule.default);
      
      // default가 객체인 경우
      if (typeof mediapipeModule.default === 'object' && mediapipeModule.default !== null) {
        if (mediapipeModule.default.Holistic) {
          Holistic = mediapipeModule.default.Holistic;
          console.log('✅ default export 객체에서 Holistic 발견');
        } else {
          console.log('default export 객체의 키들:', Object.keys(mediapipeModule.default));
        }
      }
      // default가 함수인 경우 (생성자일 수 있음)
      else if (typeof mediapipeModule.default === 'function') {
        Holistic = mediapipeModule.default;
        console.log('✅ default export가 Holistic 생성자인 것으로 추정');
      }
    }
    
    // 3. 전역 객체에서 찾기
    if (!Holistic && typeof window !== 'undefined') {
      if ((window as any).MediaPipe && (window as any).MediaPipe.Holistic) {
        Holistic = (window as any).MediaPipe.Holistic;
        console.log('✅ 전역 MediaPipe 객체에서 Holistic 발견');
      }
    }
    
    if (!Holistic) {
      console.error('❌ Holistic 생성자를 찾을 수 없습니다');
      console.log('사용 가능한 exports:', Object.keys(mediapipeModule));
      console.log('default export 타입:', typeof mediapipeModule.default);
      if (mediapipeModule.default && typeof mediapipeModule.default === 'object') {
        console.log('default export 내용:', mediapipeModule.default);
      }
      throw new Error('Holistic constructor not found in module');
    }
    
    if (typeof Holistic !== 'function') {
      console.error('❌ Holistic이 함수가 아닙니다:', typeof Holistic);
      throw new Error('Holistic is not a constructor function');
    }
    
    console.log('✅ Holistic 생성자 확인됨');
    
    // 테스트 인스턴스 생성으로 초기화 확인
    console.log('🧪 MediaPipe 테스트 인스턴스 생성...');
    const testHolistic = new Holistic({
      locateFile: (file) => {
        return `${accessibleCDN}/${file}`;
      }
    });
    
    // 기본 옵션으로 초기화 테스트
    testHolistic.setOptions({
      modelComplexity: 0,
      smoothLandmarks: false,
      enableSegmentation: false,
      smoothSegmentation: false,
      refineFaceLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    // 정리
    await testHolistic.close();
    
    console.log('✅ MediaPipe 모듈 로드 성공');
    return true;
  } catch (error) {
    console.error('❌ MediaPipe 모듈 로드 실패:', error);
    
    // 더 자세한 오류 정보 출력
    if (error instanceof Error) {
      console.error('오류 메시지:', error.message);
      console.error('오류 스택:', error.stack);
    }
    
    return false;
  }
};

// WASM 파일 접근성 확인
const checkWasmAccessibility = async (): Promise<boolean> => {
  const wasmFiles = [
    'holistic_solution_simd_wasm_bin.js',
    'holistic_solution_simd_wasm_bin.wasm'
  ];
  
  // CDN 접근성 확인
  const accessibleCDN = await checkCDNAccessibility();
  if (!accessibleCDN) {
    return false;
  }
  
  try {
    for (const file of wasmFiles) {
      const response = await fetch(`${accessibleCDN}/${file}`, {
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        console.warn(`⚠️ WASM 파일 접근 실패: ${file}`);
        return false;
      }
    }
    
    console.log('✅ WASM 파일 접근 가능');
    return true;
  } catch (error) {
    console.error('❌ WASM 파일 접근 확인 실패:', error);
    return false;
  }
};

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
  const [error, setError] = useState<string | null>(null);

  const {
    onLandmarks,
    modelComplexity = 1,
    smoothLandmarks = true,
    enableSegmentation = false,
    smoothSegmentation = true,
    refineFaceLandmarks = false,
    minDetectionConfidence = 0.5,
    minTrackingConfidence = 0.5,
    enableLogging = false,
    maxRetries = 3,
    retryDelay = 2000
  } = options;

  // 콘솔 로그 필터링 함수
  const filterConsoleLogs = useCallback(() => {
    if (!enableLogging) {
      // 원본 console.log 저장
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;
      const originalInfo = console.info;

      // MediaPipe 관련 로그 필터링
      console.log = (...args) => {
        const message = args.join(' ');
        // MediaPipe 내부 로그 필터링
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
          return; // 로그 숨김
        }
        originalLog(...args);
      };

      console.warn = (...args) => {
        const message = args.join(' ');
        // MediaPipe 관련 경고 필터링
        if (
          message.includes('GL version:') ||
          message.includes('gl_context.cc:') ||
          message.includes('I0000')
        ) {
          return; // 경고 숨김
        }
        originalWarn(...args);
      };

      // 에러는 그대로 표시 (중요한 문제일 수 있음)
      console.error = originalError;
      console.info = originalInfo;

      // 정리 함수 반환
      return () => {
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        console.info = originalInfo;
      };
    }
    return () => {}; // 로깅이 활성화된 경우 정리 함수 없음
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

  // 지연 함수
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // MediaPipe 초기화 (재시도 로직 포함)
  const initializeMediaPipe = useCallback(async (retryCount = 0): Promise<boolean> => {
    try {
      setError(null);
      
      // WebGL 지원 확인
      if (!checkWebGLSupport()) {
        throw new Error('WebGL이 지원되지 않아 MediaPipe를 초기화할 수 없습니다');
      }

      // WASM 파일 접근성 확인
      const wasmAccessible = await checkWasmAccessibility();
      if (!wasmAccessible) {
        throw new Error('WASM 파일에 접근할 수 없습니다. 네트워크 연결을 확인해주세요.');
      }

      // 로그 필터링 시작
      const cleanupLogs = filterConsoleLogs();
      
      console.log(`🎯 MediaPipe Holistic 초기화 중... (시도 ${retryCount + 1}/${maxRetries + 1})`);
      
      // 전역 로딩 상태 확인
      if (mediaPipeLoadPromise) {
        console.log('⏳ MediaPipe 모듈 로딩 대기 중...');
        const loadSuccess = await mediaPipeLoadPromise;
        if (!loadSuccess) {
          throw new Error('MediaPipe 모듈 로딩 실패');
        }
      } else {
        // 새로운 로딩 시도
        mediaPipeLoadPromise = loadMediaPipeModule();
        const loadSuccess = await mediaPipeLoadPromise;
        if (!loadSuccess) {
          mediaPipeLoadPromise = null;
          throw new Error('MediaPipe 모듈 로딩 실패');
        }
      }

      // Holistic 인스턴스 생성 (개선된 방식)
      let Holistic: any = null;
      
      // 1. 전역 객체에서 찾기 (우선순위)
      if (typeof window !== 'undefined' && (window as any).MediaPipe) {
        if ((window as any).MediaPipe.Holistic) {
          Holistic = (window as any).MediaPipe.Holistic;
          console.log('✅ 전역 MediaPipe 객체에서 Holistic 사용');
        }
      }
      
      // 2. 모듈에서 찾기
      if (!Holistic) {
        const mediapipeModule = await import('@mediapipe/holistic');
        
        // 직접 export 확인
        if (mediapipeModule.Holistic) {
          Holistic = mediapipeModule.Holistic;
        }
        // default export 확인
        else if (mediapipeModule.default) {
          if (typeof mediapipeModule.default === 'object' && mediapipeModule.default !== null) {
            if (mediapipeModule.default.Holistic) {
              Holistic = mediapipeModule.default.Holistic;
            }
          } else if (typeof mediapipeModule.default === 'function') {
            Holistic = mediapipeModule.default;
          }
        }
      }
      
      if (!Holistic) {
        throw new Error('Holistic constructor not found in module or global object');
      }
      
      // CDN 접근성 재확인
      const accessibleCDN = await checkCDNAccessibility();
      if (!accessibleCDN) {
        throw new Error('MediaPipe CDN에 접근할 수 없습니다');
      }
      
      const holistic = new Holistic({
        locateFile: (file) => {
          return `${accessibleCDN}/${file}`;
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
      
      // 로그 필터링 정리
      setTimeout(() => {
        cleanupLogs();
      }, 2000); // 2초 후 로그 필터링 해제
      
      return true;
    } catch (error) {
      console.error(`❌ MediaPipe Holistic 초기화 실패 (시도 ${retryCount + 1}):`, error);
      
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      setError(`초기화 실패: ${errorMessage}`);
      setIsInitialized(false);
      
      // 재시도 로직
      if (retryCount < maxRetries) {
        console.log(`🔄 ${retryDelay}ms 후 재시도...`);
        await delay(retryDelay);
        return initializeMediaPipe(retryCount + 1);
      }
      
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
    checkWebGLSupport,
    maxRetries,
    retryDelay
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

  // 수동 재시도 함수
  const retryInitialization = useCallback(async (): Promise<boolean> => {
    console.log('🔄 MediaPipe 초기화 재시도...');
    setError(null);
    
    // 기존 인스턴스 정리
    if (holisticRef.current) {
      await holisticRef.current.close();
      holisticRef.current = null;
    }
    
    // 전역 로딩 상태 리셋
    mediaPipeLoadPromise = null;
    
    return initializeMediaPipe();
  }, [initializeMediaPipe]);

  return {
    videoRef,
    canvasRef,
    isInitialized,
    isProcessing,
    lastLandmarks,
    error,
    startCamera,
    stopCamera,
    processFrame,
    retryInitialization
  };
}; 