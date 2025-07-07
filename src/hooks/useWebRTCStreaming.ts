import { useState, useRef, useCallback, useEffect } from 'react';
import { useWebRTC } from './useWebRTC';
import WebRTCSignalingClient from '@/services/WebRTCSignalingClient';

export interface WebRTCStreamingState {
  isInitialized: boolean;
  isConnected: boolean;
  isStreaming: boolean;
  connectionState: RTCPeerConnectionState | null;
  iceConnectionState: RTCIceConnectionState | null;
  error: string | null;
  stats: any;
  classificationResult: any;
}

export interface UseWebRTCStreamingProps {
  signalingUrl: string;
  roomId?: string;
  onClassificationResult?: (result: any) => void;
}

export const useWebRTCStreaming = ({
  signalingUrl,
  roomId = 'default',
  onClassificationResult
}: UseWebRTCStreamingProps) => {
  const [state, setState] = useState<WebRTCStreamingState>({
    isInitialized: false,
    isConnected: false,
    isStreaming: false,
    connectionState: null,
    iceConnectionState: null,
    error: null,
    stats: null,
    classificationResult: null
  });

  const signalingClientRef = useRef<WebRTCSignalingClient | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const videoFrameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebRTC 훅 사용
  const webRTC = useWebRTC({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ],
    maxBitrate: 1000000,
    maxFramerate: 30
  });

  // 시그널링 클라이언트 초기화
  const initializeSignaling = useCallback(async () => {
    try {
      const signalingClient = new WebRTCSignalingClient(signalingUrl, roomId);
      signalingClientRef.current = signalingClient;

      // 시그널링 이벤트 리스너 설정
      signalingClient.on('connected', () => {
        console.log('시그널링 서버 연결됨');
      });

      signalingClient.on('joined', (message) => {
        console.log('방 참가됨:', message);
        setState(prev => ({ ...prev, isInitialized: true }));
      });

      signalingClient.on('new-peer', (message) => {
        console.log('새 피어 발견:', message);
        peerIdRef.current = message.peer_id;
        handleNewPeer();
      });

      signalingClient.on('offer', async (message) => {
        console.log('Offer 수신:', message);
        await handleOffer(message);
      });

      signalingClient.on('answer', async (message) => {
        console.log('Answer 수신:', message);
        await handleAnswer(message);
      });

      signalingClient.on('ice-candidate', async (message) => {
        console.log('ICE 후보 수신:', message);
        await handleIceCandidate(message);
      });

      signalingClient.on('peer-disconnected', (message) => {
        console.log('피어 연결 해제:', message);
        peerIdRef.current = null;
        setState(prev => ({ ...prev, isConnected: false, isStreaming: false }));
      });

      signalingClient.on('classification-result', (message) => {
        console.log('분류 결과 수신:', message);
        setState(prev => ({ ...prev, classificationResult: message.data }));
        onClassificationResult?.(message.data);
      });

      signalingClient.on('error', (error) => {
        console.error('시그널링 오류:', error);
        setState(prev => ({ ...prev, error: error.toString() }));
      });

      await signalingClient.connect();
    } catch (error) {
      console.error('시그널링 초기화 실패:', error);
      setState(prev => ({ ...prev, error: error.toString() }));
    }
  }, [signalingUrl, roomId, onClassificationResult]);

  // 새 피어 처리
  const handleNewPeer = useCallback(async () => {
    if (!webRTC.isInitialized) return;

    try {
      const offer = await webRTC.createOffer();
      if (peerIdRef.current && signalingClientRef.current) {
        signalingClientRef.current.sendOffer(offer, peerIdRef.current);
      }
    } catch (error) {
      console.error('Offer 생성 실패:', error);
    }
  }, [webRTC]);

  // Offer 처리
  const handleOffer = useCallback(async (message: any) => {
    if (!webRTC.isInitialized) return;

    try {
      await webRTC.handleAnswer(message.answer);
      const answer = await webRTC.createOffer();
      if (message.peer_id && signalingClientRef.current) {
        signalingClientRef.current.sendAnswer(answer, message.peer_id);
      }
    } catch (error) {
      console.error('Offer 처리 실패:', error);
    }
  }, [webRTC]);

  // Answer 처리
  const handleAnswer = useCallback(async (message: any) => {
    if (!webRTC.isInitialized) return;

    try {
      await webRTC.handleAnswer(message.answer);
    } catch (error) {
      console.error('Answer 처리 실패:', error);
    }
  }, [webRTC]);

  // ICE 후보 처리
  const handleIceCandidate = useCallback(async (message: any) => {
    if (!webRTC.isInitialized) return;

    try {
      await webRTC.addIceCandidate(message.candidate);
    } catch (error) {
      console.error('ICE 후보 처리 실패:', error);
    }
  }, [webRTC]);

  // WebRTC 연결 상태 변경 감지
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isConnected: webRTC.isConnected,
      connectionState: webRTC.connectionState,
      iceConnectionState: webRTC.iceConnectionState,
      stats: webRTC.stats
    }));
  }, [webRTC.isConnected, webRTC.connectionState, webRTC.iceConnectionState, webRTC.stats]);

  // 스트리밍 시작
  const startStreaming = useCallback(async (stream: MediaStream) => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // WebRTC 초기화
      await webRTC.initialize(stream);

      // 시그널링 연결
      await initializeSignaling();

      // 비디오 프레임 전송 시작
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      videoFrameIntervalRef.current = setInterval(() => {
        if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
          ctx.drawImage(video, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          const base64 = dataURL.split(',')[1];
          
          if (signalingClientRef.current) {
            signalingClientRef.current.sendVideoFrame(base64);
          }
        }
      }, 100); // 10fps

      setState(prev => ({ ...prev, isStreaming: true }));
    } catch (error) {
      console.error('스트리밍 시작 실패:', error);
      setState(prev => ({ ...prev, error: error.toString() }));
    }
  }, [webRTC, initializeSignaling]);

  // 스트리밍 중지
  const stopStreaming = useCallback(() => {
    if (videoFrameIntervalRef.current) {
      clearInterval(videoFrameIntervalRef.current);
      videoFrameIntervalRef.current = null;
    }

    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  // 연결 해제
  const disconnect = useCallback(() => {
    stopStreaming();
    webRTC.disconnect();
    if (signalingClientRef.current) {
      signalingClientRef.current.disconnect();
    }
  }, [webRTC, stopStreaming]);

  // 정리
  useEffect(() => {
    return () => {
      disconnect();
      if (signalingClientRef.current) {
        signalingClientRef.current.destroy();
      }
    };
  }, [disconnect]);

  return {
    ...state,
    startStreaming,
    stopStreaming,
    disconnect
  };
}; 