import React, { useState, useEffect, useRef } from 'react';
import { signClassifierClient, ClassificationResult } from '../services/SignClassifierClient';
import { useVideoStream } from '../hooks/useVideoStream';

const TestPage: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [currentResult, setCurrentResult] = useState<ClassificationResult | null>(null);
  const [transmissionCount, setTransmissionCount] = useState(0);
  
  const { videoRef, canvasRef, state, startStream, stopStream, captureFrameAsync } = useVideoStream();
  const transmissionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 분류 결과 콜백 설정
    signClassifierClient.onResult((result) => {
      setCurrentResult(result);
      console.log('🎯 분류 결과:', result);
    });

    return () => {
      signClassifierClient.disconnect();
    };
  }, []);

  const handleConnect = async () => {
    const success = await signClassifierClient.connect();
    setIsConnected(success);
  };

  const handleDisconnect = () => {
    signClassifierClient.disconnect();
    setIsConnected(false);
    setIsTransmitting(false);
    setCurrentResult(null);
  };

  const handleStartTransmission = () => {
    if (!isConnected) {
      alert('먼저 서버에 연결해주세요.');
      return;
    }

    if (!state.isStreaming) {
      alert('먼저 비디오 스트림을 시작해주세요.');
      return;
    }

    setIsTransmitting(true);
    setTransmissionCount(0);

    // 100ms마다 프레임 전송 (10fps)
    transmissionIntervalRef.current = setInterval(async () => {
      const frame = await captureFrameAsync();
      if (frame) {
        const success = signClassifierClient.sendVideoChunk(frame);
        if (success) {
          setTransmissionCount(prev => prev + 1);
        }
      }
    }, 100);
  };

  const handleStopTransmission = () => {
    if (transmissionIntervalRef.current) {
      clearInterval(transmissionIntervalRef.current);
      transmissionIntervalRef.current = null;
    }
    setIsTransmitting(false);
  };

  const handleStartVideo = async () => {
    await startStream();
  };

  const handleStopVideo = () => {
    stopStream();
    handleStopTransmission();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">수어 분류 테스트</h1>
        
        {/* 연결 상태 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">연결 상태</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={handleConnect}
              disabled={isConnected}
              className={`px-4 py-2 rounded ${
                isConnected 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {isConnected ? '연결됨' : '서버 연결'}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={!isConnected}
              className={`px-4 py-2 rounded ${
                !isConnected 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              연결 해제
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isConnected ? '서버에 연결됨' : '서버에 연결되지 않음'}</span>
          </div>
        </div>

        {/* 비디오 스트림 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">비디오 스트림</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={handleStartVideo}
              disabled={state.isStreaming}
              className={`px-4 py-2 rounded ${
                state.isStreaming 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {state.isStreaming ? '스트림 실행 중' : '비디오 시작'}
            </button>
            <button
              onClick={handleStopVideo}
              disabled={!state.isStreaming}
              className={`px-4 py-2 rounded ${
                !state.isStreaming 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              비디오 중지
            </button>
          </div>
          
          {state.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {state.error}
            </div>
          )}
          
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full max-w-md border rounded"
              autoPlay
              muted
              playsInline
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
          </div>
        </div>

        {/* 전송 제어 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">전송 제어</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={handleStartTransmission}
              disabled={!isConnected || !state.isStreaming || isTransmitting}
              className={`px-4 py-2 rounded ${
                !isConnected || !state.isStreaming || isTransmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-purple-500 text-white hover:bg-purple-600'
              }`}
            >
              {isTransmitting ? '전송 중' : '전송 시작'}
            </button>
            <button
              onClick={handleStopTransmission}
              disabled={!isTransmitting}
              className={`px-4 py-2 rounded ${
                !isTransmitting 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              전송 중지
            </button>
          </div>
          <div className="text-sm text-gray-600">
            전송된 프레임 수: {transmissionCount}
          </div>
        </div>

        {/* 분류 결과 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">분류 결과</h2>
          {currentResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold">
                  {currentResult.prediction}
                </div>
                <div className="text-lg text-gray-600">
                  신뢰도: {(currentResult.confidence * 100).toFixed(1)}%
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">모든 확률:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(currentResult.probabilities)
                    .sort(([,a], [,b]) => b - a)
                    .map(([label, prob]) => (
                      <div key={label} className="flex justify-between">
                        <span>{label}</span>
                        <span className="text-gray-600">{(prob * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              분류 결과가 없습니다. 전송을 시작하면 결과가 표시됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestPage; 