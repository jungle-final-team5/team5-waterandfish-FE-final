// src/lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://<EC2_PUBLIC_IP>:3000', // docker가 이미 여기서 돌고 있음
  withCredentials: true, // 쿠키 쓸 거면
});