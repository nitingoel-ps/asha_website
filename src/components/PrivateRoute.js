import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  console.log("PrivateRoute - Auth state:", { isAuthenticated, loading });
  
  // Show loading spinner while authentication state is being determined
  if (loading) {
    console.log("PrivateRoute - Still loading auth state, showing spinner");
    return <LoadingSpinner />;
  }

  // If not authenticated and done loading, redirect to login
  if (!isAuthenticated) {
    console.log("PrivateRoute - Not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the protected component
  console.log("PrivateRoute - Authentication confirmed, rendering protected component");
  return children;
}

export default PrivateRoute;
