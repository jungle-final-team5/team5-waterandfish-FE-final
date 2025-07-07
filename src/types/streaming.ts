export interface StreamingConfig {
  fps: number;
  quality: number;
  maxWidth: number;
  maxHeight: number;
}

export interface StreamingStats {
  actualFPS: number;
  frameDropCount: number;
  bytesPerSecond: number;
  totalBytesSent: number;
  framesSent: number;
}

export interface StreamingStatus {
  isStreaming: boolean;
  status: string;
  connectionStatus: string;
}

export const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  fps: 30,
  quality: 0.7,
  maxWidth: 320,
  maxHeight: 240,
};

export const STREAMING_PRESETS = {
  LOW: { fps: 10, quality: 0.3, maxWidth: 160, maxHeight: 120 },
  MEDIUM: { fps: 15, quality: 0.5, maxWidth: 320, maxHeight: 240 },
  HIGH: { fps: 20, quality: 0.7, maxWidth: 640, maxHeight: 480 },
  ULTRA: { fps: 30, quality: 0.9, maxWidth: 640, maxHeight: 480 },
}; 