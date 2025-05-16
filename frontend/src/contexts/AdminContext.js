import React, { createContext, useContext, useState, useEffect } from 'react';

const ADMIN_PASSWORD = '0824';
const LOCAL_KEY = 'fc_support_is_admin';

const AdminContext = createContext();

export const useAdmin = () => useContext(AdminContext);

export const AdminProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored === 'true') setIsAdmin(true);
  }, []);

  const login = (pw) => {
    if (pw === ADMIN_PASSWORD) {
      setIsAdmin(true);
      localStorage.setItem(LOCAL_KEY, 'true');
      return true;
    }
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