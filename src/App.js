import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './components/Home';
import Register from './components/Register';
import Login from './components/Login';
import AddProviders from './components/AddProviders';
import PatientDashboard from './components/PatientDashboard';
import MyDocuments from './components/MyDocuments';
import PrivateRoute from './components/PrivateRoute';
import UploadFiles from "./components/UploadFiles";
import { LoggedInNavbar, LoggedOutNavbar } from './components/Navigation';
import InvitationCodeEntry from './components/InvitationCodeEntry';

import './theme.css';

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {isAuthenticated ? <LoggedInNavbar /> : <LoggedOutNavbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/add-providers"
          element={
            <PrivateRoute>
              <AddProviders />
            </PrivateRoute>
          }
        />
        <Route
          path="/upload-files"
          element={
            <PrivateRoute>
              <UploadFiles />
            </PrivateRoute>
          }
        />
        <Route 
          path="/patient-dashboard/*" 
          element={
            <PrivateRoute>
              <PatientDashboard />
            </PrivateRoute>
          } 
        />
        <Route path="/my-documents" element={<MyDocuments />} />
        <Route path="/registration" element={<InvitationCodeEntry />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
