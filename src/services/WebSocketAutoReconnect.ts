import { WebSocketConnection, getGlobalWebSocketState } from '@/hooks/useWebsocket';
import { reconnectWebSocket } from '@/hooks/useWebsocket';

interface ReconnectConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

interface ReconnectState {
  connectionId: string;
  retries: number;
  nextRetryAt: Date | null;
  timeoutId: NodeJS.Timeout | null;
  isReconnecting: boolean;
}

class WebSocketAutoReconnectService {
  private static instance: WebSocketAutoReconnectService;
  private config: ReconnectConfig;
  private reconnectStates: Map<string, ReconnectState>;
  private monitoringInterval: NodeJS.Timeout | null;
  private isRunning: boolean;

  private constructor() {
    this.config = {
      maxRetries: 5,
      baseDelay: 1000, // 1초
      maxDelay: 30000, // 30초
      backoffMultiplier: 2,
      jitter: true
    };
    
    this.reconnectStates = new Map();
    this.monitoringInterval = null;
    this.isRunning = false;
  }

  static getInstance(): WebSocketAutoReconnectService {
    if (!WebSocketAutoReconnectService.instance) {
      WebSocketAutoReconnectService.instance = new WebSocketAutoReconnectService();
    }
    return WebSocketAutoReconnectService.instance;
  }

  // 자동 재연결 서비스 시작
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('WebSocket 자동 재연결 서비스 시작');
    
    // 5초마다 연결 상태 체크
    this.monitoringInterval = setInterval(() => {
      this.checkConnections();
    }, 5000);
  }

  // 자동 재연결 서비스 중지
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    console.log('WebSocket 자동 재연결 서비스 중지');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    // 모든 재연결 타이머 정리
    this.reconnectStates.forEach(state => {
      if (state.timeoutId) {
        clearTimeout(state.timeoutId);
      }
    });
    this.reconnectStates.clear();
  }

  // 연결 상태 체크
  private checkConnections(): void {
    const globalState = getGlobalWebSocketState();
    
    globalState.connections.forEach(connection => {
      if (connection.autoReconnect && this.shouldReconnect(connection)) {
        this.scheduleReconnect(connection);
      }
    });
  }

  // 재연결이 필요한지 판단
  private shouldReconnect(connection: WebSocketConnection): boolean {
    // 이미 재연결 중이거나 연결된 상태면 스킵
    if (connection.status === 'connected' || connection.status === 'connecting' || connection.status === 'reconnecting') {
      return false;
    }
    
    // 자동 재연결이 비활성화된 경우 스킵
    if (!connection.autoReconnect) {
      return false;
    }
    
    // 이미 재연결이 스케줄되어 있는 경우 스킵
    const reconnectState = this.reconnectStates.get(connection.id);
    if (reconnectState && reconnectState.isReconnecting) {
      return false;
    }
    
    // 최대 재시도 횟수 확인
    if (reconnectState && reconnectState.retries >= this.config.maxRetries) {
      console.log(`연결 ${connection.url} 최대 재시도 횟수 초과`);
      return false;
    }
    
    return true;
  }

  // 재연결 스케줄링
  private scheduleReconnect(connection: WebSocketConnection): void {
    let reconnectState = this.reconnectStates.get(connection.id);
    
    if (!reconnectState) {
      reconnectState = {
        connectionId: connection.id,
        retries: 0,
        nextRetryAt: null,
        timeoutId: null,
        isReconnecting: false
      };
      this.reconnectStates.set(connection.id, reconnectState);
    }
    
    // 이미 스케줄된 재연결이 있으면 스킵
    if (reconnectState.isReconnecting) {
      return;
    }
    
    const delay = this.calculateDelay(reconnectState.retries);
    const nextRetryAt = new Date(Date.now() + delay);
    
    reconnectState.nextRetryAt = nextRetryAt;
    reconnectState.isReconnecting = true;
    
    console.log(`연결 ${connection.url} 재연결 예약: ${delay}ms 후 (${reconnectState.retries + 1}/${this.config.maxRetries})`);
    
    reconnectState.timeoutId = setTimeout(() => {
      this.attemptReconnect(connection.id);
    }, delay);
  }

  // 지수 백오프 지연 시간 계산
  private calculateDelay(retries: number): number {
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, retries);
    
    // 최대 지연 시간 제한
    delay = Math.min(delay, this.config.maxDelay);
    
    // 지터 추가 (랜덤 요소)
    if (this.config.jitter) {
      const jitterAmount = delay * 0.1; // 10% 지터
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return Math.max(delay, this.config.baseDelay);
  }

  // 재연결 시도
  private attemptReconnect(connectionId: string): void {
    const reconnectState = this.reconnectStates.get(connectionId);
    if (!reconnectState) return;
    
    const globalState = getGlobalWebSocketState();
    const connection = globalState.connections.find(c => c.id === connectionId);
    
    if (!connection) {
      // 연결이 더 이상 존재하지 않으면 정리
      this.reconnectStates.delete(connectionId);
      return;
    }
    
    if (connection.status === 'connected') {
      // 이미 연결된 상태면 재연결 상태 정리
      this.reconnectStates.delete(connectionId);
      return;
    }
    
    reconnectState.retries++;
    reconnectState.isReconnecting = false;
    reconnectState.timeoutId = null;
    
    console.log(`연결 ${connection.url} 재연결 시도 (${reconnectState.retries}/${this.config.maxRetries})`);
    
    try {
      // 재연결 시도
      reconnectWebSocket(connectionId);
      
      // 재연결 성공 체크를 위해 잠시 대기
      setTimeout(() => {
        const updatedConnection = getGlobalWebSocketState().connections.find(c => c.id === connectionId);
        if (updatedConnection && updatedConnection.status === 'connected') {
          // 재연결 성공
          console.log(`연결 ${connection.url} 재연결 성공`);
          this.reconnectStates.delete(connectionId);
        } else if (reconnectState.retries < this.config.maxRetries) {
          // 재연결 실패, 다시 스케줄
          this.scheduleReconnect(connection);
        } else {
          // 최대 재시도 횟수 초과
          console.error(`연결 ${connection.url} 재연결 최대 시도 횟수 초과`);
          this.reconnectStates.delete(connectionId);
        }
      }, 3000); // 3초 후 상태 확인
      
    } catch (error) {
      console.error(`연결 ${connection.url} 재연결 실패:`, error);
      
      if (reconnectState.retries < this.config.maxRetries) {
        // 재시도 가능하면 다시 스케줄
        this.scheduleReconnect(connection);
      } else {
        // 최대 재시도 횟수 초과
        this.reconnectStates.delete(connectionId);
      }
    }
  }

  // 특정 연결의 재연결 상태 조회
  getReconnectState(connectionId: string): ReconnectState | undefined {
    return this.reconnectStates.get(connectionId);
  }

  // 모든 재연결 상태 조회
  getAllReconnectStates(): Map<string, ReconnectState> {
    return new Map(this.reconnectStates);
  }

  // 설정 업데이트
  updateConfig(config: Partial<ReconnectConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('자동 재연결 설정 업데이트:', this.config);
  }

  // 특정 연결의 재연결 취소
  cancelReconnect(connectionId: string): void {
    const reconnectState = this.reconnectStates.get(connectionId);
    if (reconnectState && reconnectState.timeoutId) {
      clearTimeout(reconnectState.timeoutId);
      this.reconnectStates.delete(connectionId);
      console.log(`연결 ${connectionId} 재연결 취소`);
    }
  }

  // 현재 서비스 상태 조회
  getStatus(): {
    isRunning: boolean;
    monitoringConnections: number;
    activeReconnects: number;
    config: ReconnectConfig;
  } {
    return {
      isRunning: this.isRunning,
      monitoringConnections: getGlobalWebSocketState().connections.length,
      activeReconnects: this.reconnectStates.size,
      config: this.config
    };
  }
}

export default WebSocketAutoReconnectService; 