export interface ClassificationResult {
  prediction: string;
  confidence: number;
  probabilities: Record<string, number>;
}

// 랜드마크 데이터 타입 정의
export interface LandmarksData {
  pose: number[][] | null;      // 33개 포즈 랜드마크 [x, y, z]
  left_hand: number[][] | null; // 21개 왼손 랜드마크 [x, y, z]
  right_hand: number[][] | null; // 21개 오른손 랜드마크 [x, y, z]
}

export interface LandmarksMessage {
  type: 'landmarks';
  data: LandmarksData;
  timestamp: number;
}

export interface ClassificationResultMessage {
  type: 'classification_result';
  data: ClassificationResult;
  timestamp: number;
}

export interface PingMessage {
  type: 'ping';
}

export interface PongMessage {
  type: 'pong';
}

export type WebSocketMessage = LandmarksMessage | ClassificationResultMessage | PingMessage | PongMessage;

export class SignClassifierClient {
  private websocket: WebSocket | null = null;
  private serverUrl: string;
  private isConnected: boolean = false;
  private onResultCallback: ((result: ClassificationResult) => void) | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000; // 2초

  constructor(serverUrl: string = 'ws://localhost:8765') {
    this.serverUrl = serverUrl;
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        console.log(`🔌 분류 서버에 연결 시도: ${this.serverUrl}`);
        
        this.websocket = new WebSocket(this.serverUrl);
        
        this.websocket.onopen = () => {
          console.log('✅ 분류 서버에 연결됨 (랜드마크 모드)');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(true);
        };
        
        this.websocket.onmessage = (event) => {
          try {
            const data: WebSocketMessage = JSON.parse(event.data);
            
            if (data.type === 'classification_result') {
              if (this.onResultCallback) {
                this.onResultCallback(data.data);
              }
            } else if (data.type === 'pong') {
              console.log('🏓 Pong received');
            }
          } catch (error) {
            console.error('❌ 메시지 파싱 실패:', error);
          }
        };
        
        this.websocket.onclose = (event) => {
          console.log(`🔴 분류 서버 연결 종료: ${event.code} - ${event.reason}`);
          this.isConnected = false;
          
          // 자동 재연결 시도
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
            setTimeout(() => {
              this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
          } else {
            console.error('❌ 최대 재연결 시도 횟수 초과');
          }
        };
        
        this.websocket.onerror = (error) => {
          console.error('❌ WebSocket 오류:', error);
          this.isConnected = false;
          resolve(false);
        };
        
      } catch (error) {
        console.error('❌ 연결 실패:', error);
        this.isConnected = false;
        resolve(false);
      }
    });
  }

  sendLandmarks(landmarksData: LandmarksData): boolean {
    if (!this.isConnected || !this.websocket) {
      console.warn('⚠️ 서버에 연결되지 않음');
      return false;
    }

    const message: LandmarksMessage = {
      type: 'landmarks',
      data: landmarksData,
      timestamp: Date.now()
    };

    try {
      this.websocket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('❌ 랜드마크 데이터 전송 실패:', error);
      return false;
    }
  }

  sendPing(): boolean {
    if (!this.isConnected || !this.websocket) {
      return false;
    }

    const message: PingMessage = {
      type: 'ping'
    };

    try {
      this.websocket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('❌ Ping 전송 실패:', error);
      return false;
    }
  }

  onResult(callback: (result: ClassificationResult) => void): void {
    this.onResultCallback = callback;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.isConnected = false;
    this.onResultCallback = null;
    console.log('🔌 분류 서버 연결 해제');
  }
}

// 싱글톤 인스턴스
export const signClassifierClient = new SignClassifierClient(); 