import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { setToken, getToken, removeToken } from '../utils/jwt';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // JWT 토큰이 있으면 사용자 정보 fetch (선택)
  useEffect(() => {
    const token = getToken();
    if (token) {
      // 필요시 사용자 정보 fetch
      setUser({ isAdmin: true }); // 임시: 실제로는 백엔드에서 사용자 정보 받아야 함
    }
  }, []);

  // 로그인: username, password로 JWT 발급
  const login = async (username, password) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/token/', { username, password });
      setToken(res.data.access);
      setUser({ isAdmin: true }); // 실제로는 토큰 decode 또는 사용자 정보 fetch
      return true;
    } catch (err) {
      setError('로그인 실패: 아이디 또는 비밀번호를 확인하세요.');
      setUser(null);
      removeToken();
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    removeToken();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};
