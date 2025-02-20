import React, { createContext, useState, useContext } from 'react';
import { Amplify } from 'aws-amplify';
import { signUp } from 'aws-amplify/auth';

// Hook to access AuthContext
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // State for authentication
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('access_token') // Check if the user is already logged in
  );

  // State for storing user details
  const [user, setUser] = useState(null);

  // Function to handle login
  const login = () => {
    setIsAuthenticated(true);
  };

  // Function to handle logout
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
    setUser(null); // Clear user data
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);



