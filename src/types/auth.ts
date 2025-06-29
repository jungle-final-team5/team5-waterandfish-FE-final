// src/types/auth.ts (새 파일 생성)
export interface AuthUrlResponse {
    auth_url: string;
  }
  
  export interface LoginResponse {
    user: {
      _id: string;
      email: string;
      nickname: string;
      handedness: string | null;
      streak_days: number;
      overall_progress: number;
      description: string | null;
    };
  }

  export interface UserData {
    _id: string;
    email: string;
    nickname: string;
    handedness: string | null;
    streak_days: number;
    overall_progress: number;
    description: string | null;
  }