// JWT 인증 관련 axios 인스턴스 및 유틸 함수
import axios from 'axios';

const TOKEN_KEY = 'fc_support_jwt';

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// 인증이 필요한 요청에 사용할 axios 인스턴스
export const authAxios = axios.create();

authAxios.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
