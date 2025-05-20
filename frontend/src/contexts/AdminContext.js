import React, { createContext, useContext, useState, useEffect } from 'react';
import { getToken } from '../utils/jwt';

const LOCAL_KEY = 'fc_support_is_admin';

const AdminContext = createContext();

export const useAdmin = () => useContext(AdminContext);

export const AdminProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // JWT 토큰이 있으면 관리자 모드로 간주
    if (getToken()) setIsAdmin(true);
    else setIsAdmin(false);
  }, []);

  const login = (pw) => {
    // 더 이상 프론트 비번만으로 관리자 모드 진입 불가
    return false;
  };

  const logout = () => {
    setIsAdmin(false);
    localStorage.removeItem(LOCAL_KEY);
  };

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
};