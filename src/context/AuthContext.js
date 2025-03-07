import React, { createContext, useState, useContext, useEffect } from 'react';
import axiosInstance, { setUserUpdateFunction } from '../utils/axiosInstance';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  console.log("AuthProvider rendering with state:", { isAuthenticated, loading });

  // Function to update user state, will be passed to axiosInstance
  const updateUser = (userData) => {
    console.log("updateUser called with:", userData ? "user data present" : "no user data");
    setUser(userData);
  };

  // Set up the user update function for token refresh
  useEffect(() => {
    console.log("Setting up user update function");
    setUserUpdateFunction(updateUser);
  }, []);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      console.log("Initializing auth... (in initial useEffect)");
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const apiBaseURL = process.env.REACT_APP_API_BASE_URL;
      
      if (token) {
        console.log("Found access token in localStorage");
        try {
          // Set authorization header
          axiosInstance.defaults.headers['Authorization'] = `Bearer ${token}`;
          
          // Fetch user data
          console.log("Attempting to fetch user data");
          const userResponse = await axiosInstance.get('/user-context/');
          console.log("User data fetched successfully");
          setUser(userResponse.data);
          setIsAuthenticated(true);
        } catch (error) {
          console.log("Error initializing auth, trying to refresh token:", error);
          
          // If fetching user data fails, try to refresh the token
          if (refreshToken) {
            try {
              console.log("Attempting token refresh");
              const response = await axios.post(`${apiBaseURL}/token/refresh/`, {
                refresh: refreshToken
              });
              
              const newAccessToken = response.data.access;
              console.log("Token refreshed successfully");
              localStorage.setItem('access_token', newAccessToken);
              axiosInstance.defaults.headers['Authorization'] = `Bearer ${newAccessToken}`;
              
              // Try again with new token
              console.log("Retrying user data fetch with new token");
              const userResponse = await axiosInstance.get('/user-context/');
              setUser(userResponse.data);
              setIsAuthenticated(true);
              console.log("Auth initialized with refreshed token");
            } catch (refreshError) {
              console.error("Error refreshing token:", refreshError);
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              setIsAuthenticated(false);
              setUser(null);
              console.log("Auth failed after token refresh attempt");
            }
          } else {
            console.log("No refresh token available");
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } else {
        console.log("No access token found in localStorage");
        setIsAuthenticated(false);
        setUser(null);
      }
      
      console.log("Auth initialization complete, setting loading to false");
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = () => {
    console.log("Login function called");
    setIsAuthenticated(true);
  };

  const logout = () => {
    console.log("Logout function called");
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



