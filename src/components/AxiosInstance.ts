import axios from 'axios';

// 토큰 갱신 상태 관리
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: any = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 쿠키를 포함하여 요청
});

// 응답 인터셉터 - 토큰 만료 처리
API.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('🔐 401 에러 감지 - 토큰 갱신 시작');
      
      if (isRefreshing) {
        console.log('⏳ 이미 토큰 갱신 중 - 대기열에 추가');
        // 이미 토큰 갱신 중이면 대기열에 추가
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return API(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        console.log('🔄 토큰 갱신 요청 전송...');
        // 백엔드에서 자동으로 리프레시 토큰을 사용해 새 액세스 토큰 발급
        const response = await API.post('auth/refresh');
        console.log('✅ 토큰 갱신 성공');
        
        // 대기열에 있는 요청들 처리
        processQueue(null, response.data);
        
        // 토큰 갱신 성공 시 원래 요청 재시도
        console.log('🔄 원래 요청 재시도...');
        return API(originalRequest);
      } catch (refreshError) {
        // 리프레시 토큰도 만료된 경우 로그아웃
        console.error('❌ 토큰 갱신 실패:', refreshError);
        processQueue(refreshError, null);
        localStorage.removeItem('user');
        localStorage.removeItem('nickname');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

export default API;