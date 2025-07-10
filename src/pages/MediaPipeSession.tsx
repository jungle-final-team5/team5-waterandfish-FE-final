import { useState, useEffect, useRef, useCallback } from 'react';
import { signClassifierClient, ClassificationResult, LandmarksData } from '../services/SignClassifierClient';
import { useMediaPipeHolistic } from '@/hooks/useMediaPipeHolistic';
import { Button } from '@/components/ui/button';

const MediaPipeSession = () => {
  // 연결 및 상태 관리
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentResult, setCurrentResult] = useState<ClassificationResult | null>(null);
  const [transmissionCount, setTransmissionCount] = useState(0);
  const [showDebugCanvas, setShowDebugCanvas] = useState(true);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  // MediaPipe 랜드마크 전송 간격 관리
  const transmissionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebGL 지원 확인
  useEffect(() => {
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        setWebglSupported(!!gl);
      } catch (err) {
        setWebglSupported(false);
      }
    };
    
    checkWebGL();
  }, []);

  // 랜드마크 감지 시 호출되는 콜백 (useCallback으로 먼저 정의)
  const handleLandmarksDetected = useCallback((landmarks: LandmarksData) => {
    // 녹화 중일 때만 서버로 전송
    if (isRecording && isConnected) {
      const success = signClassifierClient.sendLandmarks(landmarks);
      if (success) {
        setTransmissionCount(prev => prev + 1);
        console.log(`📤 랜드마크 전송됨 (${transmissionCount + 1})`);
      }
    }
  }, [isRecording, isConnected, transmissionCount]);

  // MediaPipe holistic hook 사용
  const {
    videoRef,
    canvasRef,
    isInitialized,
    isProcessing,
    lastLandmarks,
    startCamera,
    stopCamera
  } = useMediaPipeHolistic({
    onLandmarks: handleLandmarksDetected,
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
    enableLogging: false // MediaPipe 내부 로그 숨김
  });

  // 서버 연결 시도
  const attemptConnection = async (): Promise<boolean> => {
    setIsConnecting(true);
    try {
      console.log('🔌 수어 분류 서버 연결 시도...');
      const success = await signClassifierClient.connect();
      if (success) {
        setIsConnected(true);
        console.log('✅ 서버 연결 성공');
        
        // 분류 결과 콜백 설정
        signClassifierClient.onResult((result) => {
          setCurrentResult(result);
          console.log('🎯 분류 결과:', result);
        });
        
        return true;
      } else {
        console.log('❌ 서버 연결 실패');
        return false;
      }
    } catch (error) {
      console.error('❌ 연결 중 오류:', error);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // 카메라 및 MediaPipe 초기화
  const initializeSession = async () => {
    if (!isInitialized) {
      console.log('⚠️ MediaPipe가 아직 초기화되지 않음');
      return false;
    }

    try {
      console.log('📹 카메라 시작 중...');
      const cameraStarted = await startCamera();
      
      if (cameraStarted) {
        console.log('✅ 세션 초기화 완료');
        return true;
      } else {
        console.log('❌ 카메라 시작 실패');
        return false;
      }
    } catch (error) {
      console.error('❌ 세션 초기화 실패:', error);
      return false;
    }
  };

  // 녹화 시작
  const handleStartRecording = useCallback(() => {
    if (!isConnected) {
      console.warn('⚠️ 서버에 연결되지 않음');
      return;
    }

    setIsRecording(true);
    setCurrentResult(null);
    setTransmissionCount(0);
    console.log('🎬 수어 녹화 시작');
  }, [isConnected]);

  // 녹화 중지
  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
    console.log('⏹️ 수어 녹화 중지');
  }, []);

  // 연결 상태 확인 및 자동 재연결
  useEffect(() => {
    const checkConnection = setInterval(() => {
      const currentStatus = signClassifierClient.getConnectionStatus();
      if (currentStatus !== isConnected) {
        setIsConnected(currentStatus);
        if (!currentStatus) {
          setIsTransmitting(false);
          setIsRecording(false);
        }
      }
    }, 1000);

    return () => clearInterval(checkConnection);
  }, [isConnected]);

  // 컴포넌트 마운트 시 자동 초기화
  useEffect(() => {
    const initialize = async () => {
      // MediaPipe 초기화 대기
      if (isInitialized) {
        console.log('🚀 자동 초기화 시작...');
        // await attemptConnection();
        await initializeSession();
      }
    };

    initialize();

    // 언마운트 시 정리
    return () => {
      signClassifierClient.disconnect();
      stopCamera();
      if (transmissionIntervalRef.current) {
        clearInterval(transmissionIntervalRef.current);
      }
    };
  }, [isInitialized]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            MediaPipe 수어 분류 테스트
          </h1>
          <p className="text-gray-600">
            MediaPipe Holistic을 사용한 실시간 수어 인식 시스템
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 비디오 섹션 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📹 카메라 & MediaPipe
            </h2>
            
            <div className="relative mb-4">
              {/* 비디오 엘리먼트 */}
              <video
                ref={videoRef}
                className="w-full rounded-lg bg-gray-900"
                autoPlay
                muted
                playsInline
                style={{ maxHeight: '360px' }}
              />
              
              {/* 디버그 캔버스 (랜드마크 시각화) */}
              {showDebugCanvas && (
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full rounded-lg pointer-events-none"
                  style={{ opacity: 0.8 }}
                />
              )}
              
              {/* 상태 오버레이 */}
              <div className="absolute top-2 left-2 space-y-2">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  webglSupported === null ? 'bg-gray-100 text-gray-800' :
                  webglSupported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {webglSupported === null ? '⏳ WebGL 확인 중...' :
                   webglSupported ? '✅ WebGL 지원됨' : '❌ WebGL 미지원'}
                </div>
                
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isInitialized ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {isInitialized ? '✅ MediaPipe 준비됨' : '⏳ MediaPipe 초기화 중...'}
                </div>
                
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isConnected ? '🟢 서버 연결됨' : '🔴 서버 연결 끊김'}
                </div>
                
                {isRecording && (
                  <div className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 animate-pulse">
                    🔴 녹화 중
                  </div>
                )}
                
                {isProcessing && (
                  <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    🧠 처리 중
                  </div>
                )}
              </div>
            </div>

            {/* 컨트롤 버튼 */}
            <div className="flex gap-3 mb-4">
              <Button
                onClick={attemptConnection}
                disabled={isConnecting || isConnected}
                className="flex-1"
              >
                {isConnecting ? '연결 중...' : isConnected ? '연결됨' : '서버 연결'}
              </Button>
              
              <Button
                onClick={initializeSession}
                disabled={!isInitialized || !isConnected}
                variant="outline"
                className="flex-1"
              >
                세션 초기화
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleStartRecording}
                disabled={!isConnected || isRecording}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                🎬 녹화 시작
              </Button>
              
              <Button
                onClick={handleStopRecording}
                disabled={!isRecording}
                variant="destructive"
                className="flex-1"
              >
                ⏹️ 녹화 중지
              </Button>
            </div>

            {/* 디버그 옵션 */}
            <div className="mt-4 pt-4 border-t">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showDebugCanvas}
                  onChange={(e) => setShowDebugCanvas(e.target.checked)}
                />
                <span className="text-sm text-gray-600">랜드마크 시각화 표시</span>
              </label>
            </div>
          </div>

          {/* 결과 섹션 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              🎯 분류 결과
            </h2>

            {/* 현재 분류 결과 */}
            {currentResult ? (
              <div className="mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
                  <div className="text-2xl font-bold text-indigo-800 mb-2">
                    {currentResult.prediction}
                  </div>
                  <div className="text-lg text-indigo-600">
                    신뢰도: {(currentResult.confidence * 100).toFixed(1)}%
                  </div>
                </div>

                {/* 상위 예측 확률들 */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-700">전체 예측 확률:</h3>
                  {Object.entries(currentResult.probabilities)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([label, prob]) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{label}</span>
                        <span className="text-sm font-mono">
                          {(prob * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                수어를 녹화하면 여기에 분류 결과가 표시됩니다
              </div>
            )}

            {/* 통계 정보 */}
            <div className="mt-6 pt-4 border-t">
              <h3 className="font-semibold text-gray-700 mb-2">시스템 상태:</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">WebGL 지원:</span>
                  <span className={`ml-2 ${
                    webglSupported === null ? 'text-gray-600' :
                    webglSupported ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {webglSupported === null ? '확인 중' :
                     webglSupported ? '지원됨' : '미지원'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">MediaPipe 상태:</span>
                  <span className={`ml-2 ${isInitialized ? 'text-green-600' : 'text-yellow-600'}`}>
                    {isInitialized ? '준비됨' : '초기화 중'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">전송된 랜드마크:</span>
                  <span className="ml-2 font-mono">{transmissionCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">서버 연결:</span>
                  <span className={`ml-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {isConnected ? '연결됨' : '끊김'}
                  </span>
                </div>
              </div>
            </div>

            {/* 마지막 랜드마크 정보 */}
            {lastLandmarks && (
              <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
                <div className="font-semibold mb-1">마지막 랜드마크:</div>
                <div>포즈: {lastLandmarks.pose ? `${lastLandmarks.pose.length}개` : '없음'}</div>
                <div>왼손: {lastLandmarks.left_hand ? `${lastLandmarks.left_hand.length}개` : '없음'}</div>
                <div>오른손: {lastLandmarks.right_hand ? `${lastLandmarks.right_hand.length}개` : '없음'}</div>
              </div>
            )}
          </div>
        </div>

        {/* 사용 안내 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            📋 사용 방법
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>WebGL 지원 상태를 확인합니다 (브라우저 호환성)</li>
            <li>MediaPipe 초기화가 완료될 때까지 기다립니다</li>
            <li>"서버 연결" 버튼을 클릭하여 분류 서버에 연결합니다</li>
            <li>"세션 초기화" 버튼을 클릭하여 카메라를 시작합니다</li>
            <li>"녹화 시작" 버튼을 클릭하여 수어 인식을 시작합니다</li>
            <li>수어를 하면 실시간으로 랜드마크가 추출되어 서버로 전송됩니다</li>
            <li>분류 결과가 오른쪽 패널에 표시됩니다</li>
          </ol>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">💡 참고사항</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• WebGL이 지원되지 않는 브라우저에서는 MediaPipe가 작동하지 않습니다</li>
              <li>• Chrome, Firefox, Safari 최신 버전을 권장합니다</li>
              <li>• 카메라 권한을 허용해야 합니다</li>
              <li>• MediaPipe 초기화 중 콘솔에 WebGL 관련 로그가 나타날 수 있지만 정상입니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaPipeSession; 