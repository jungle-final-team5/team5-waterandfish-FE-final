import { useState, useRef, useCallback, useEffect } from 'react';
import WebRTCService, { WebRTCConfig, WebRTCStats, WebRTCMessage } from '@/services/WebRTCService';

export interface WebRTCState {
  isInitialized: boolean;
  isConnected: boolean;
  connectionState: RTCPeerConnectionState | null;
  iceConnectionState: RTCIceConnectionState | null;
  error: string | null;
  stats: WebRTCStats | null;
}

export interface UseWebRTCReturn extends WebRTCState {
  initialize: (stream: MediaStream) => Promise<void>;
  createOffer: () => Promise<RTCSessionDescriptionInit>;
  handleAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>;
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  sendMessage: (message: WebRTCMessage) => boolean;
  disconnect: () => void;
  destroy: () => void;
}

export const useWebRTC = (config?: Partial<WebRTCConfig>): UseWebRTCReturn => {
  const [state, setState] = useState<WebRTCState>({
    isInitialized: false,
    isConnected: false,
    connectionState: null,
    iceConnectionState: null,
    error: null,
    stats: null
  });

  const webRTCServiceRef = useRef<WebRTCService | null>(null);

  // WebRTC 서비스 초기화
  const initialize = useCallback(async (stream: MediaStream) => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const service = new WebRTCService(config);
      webRTCServiceRef.current = service;

      // 이벤트 리스너 설정
      service.on('initialized', () => {
        setState(prev => ({ ...prev, isInitialized: true }));
      });

      service.on('connected', () => {
        setState(prev => ({ ...prev, isConnected: true }));
      });

      service.on('disconnected', () => {
        setState(prev => ({ 
          ...prev, 
          isConnected: false,
          connectionState: 'disconnected'
        }));
      });

      service.on('connection-state-change', (connectionState) => {
        setState(prev => ({ ...prev, connectionState }));
      });

      service.on('ice-connection-state-change', (iceConnectionState) => {
        setState(prev => ({ ...prev, iceConnectionState }));
      });

      service.on('stats', (stats) => {
        setState(prev => ({ ...prev, stats }));
      });

      service.on('error', (error) => {
        setState(prev => ({ ...prev, error }));
      });

      service.on('message', (message: WebRTCMessage) => {
        // 메시지 처리 로직
        console.log('WebRTC 메시지 수신:', message);
      });

      await service.initialize(stream);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [config]);

  // Offer 생성
  const createOffer = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
    if (!webRTCServiceRef.current) {
      throw new Error('WebRTC 서비스가 초기화되지 않았습니다.');
    }
    return await webRTCServiceRef.current.createOffer();
  }, []);

  // Answer 처리
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit): Promise<void> => {
    if (!webRTCServiceRef.current) {
      throw new Error('WebRTC 서비스가 초기화되지 않았습니다.');
    }
    await webRTCServiceRef.current.handleAnswer(answer);
  }, []);

  // ICE 후보 추가
  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit): Promise<void> => {
    if (!webRTCServiceRef.current) {
      throw new Error('WebRTC 서비스가 초기화되지 않았습니다.');
    }
    await webRTCServiceRef.current.addIceCandidate(candidate);
  }, []);

  // 메시지 전송
  const sendMessage = useCallback((message: WebRTCMessage): boolean => {
    if (!webRTCServiceRef.current) {
      return false;
    }
    return webRTCServiceRef.current.sendMessage(message);
  }, []);

  // 연결 해제
  const disconnect = useCallback(() => {
    if (webRTCServiceRef.current) {
      webRTCServiceRef.current.disconnect();
    }
  }, []);

  // 서비스 정리
  const destroy = useCallback(() => {
    if (webRTCServiceRef.current) {
      webRTCServiceRef.current.destroy();
      webRTCServiceRef.current = null;
    }
    setState({
      isInitialized: false,
      isConnected: false,
      connectionState: null,
      iceConnectionState: null,
      error: null,
      stats: null
    });
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      destroy();
    };
  }, [destroy]);

  return {
    ...state,
    initialize,
    createOffer,
    handleAnswer,
    addIceCandidate,
    sendMessage,
    disconnect,
    destroy
  };
}; 