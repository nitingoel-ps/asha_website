import React, { createContext, useState, useContext, useEffect } from 'react';
import axiosInstance, { setUserUpdateFunction } from '../utils/axiosInstance';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to update user state, will be passed to axiosInstance
  const updateUser = (userData) => {
    setUser(userData);
  };

  // Set up the user update function for token refresh
  useEffect(() => {
    setUserUpdateFunction(updateUser);
  }, []);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('access_token');
      
      if (token) {
        try {
          // Set authorization header
          axiosInstance.defaults.headers['Authorization'] = `Bearer ${token}`;
          
          // Fetch user data
          const userResponse = await axiosInstance.get('/user-context');
          setUser(userResponse.data);
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Error initializing auth:", error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    // Clear tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Reset auth state
    setIsAuthenticated(false);
    setUser(null);
    
    // Clear authorization header
    delete axiosInstance.defaults.headers['Authorization'];
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        login,
        logout,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);



