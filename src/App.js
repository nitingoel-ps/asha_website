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
import ConfigurationLayout from './components/Configuration/ConfigurationLayout';
import ConfigurationHome from './components/Configuration/ConfigurationHome';
import LabPanelReview from './components/Configuration/StandardLabs/LabPanelReview';
import ManageStandardLabs from './components/Configuration/StandardLabs/ManageStandardLabs';
import ManageStandardPanels from './components/Configuration/StandardLabs/ManageStandardPanels';
import PanelDetail from './components/Configuration/StandardLabs/PanelDetail';
import AIChat from './components/AIChat/AIChat';
import AddHealthData from './components/Health/AddHealthData';
import LoadingSpinner from './components/LoadingSpinner';
import AIVoice from './components/AIVoice/AIVoice';

import './theme.css';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  
  console.log("AppContent rendering with auth state:", { isAuthenticated, loading });

  // Show loading spinner while authentication state is initializing
  if (loading) {
    console.log("App is still loading authentication state");
    return <LoadingSpinner />;
  }

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
        <Route path="/configuration/*" element={<ConfigurationLayout />}>
          <Route index element={<ConfigurationHome />} />
          <Route path="lab-panel-review" element={<LabPanelReview />} />
          <Route path="manage-standard-labs" element={<ManageStandardLabs />} />
          <Route path="manage-standard-panels" element={<ManageStandardPanels />} />
          <Route path="manage-standard-panels/:panelId" element={<PanelDetail />} />
        </Route>
        <Route
          path="/ai-chat/*"
          element={
            <PrivateRoute>
              <AIChat />
            </PrivateRoute>
          }
        />
        <Route
          path="/ai-voice"
          element={
            <PrivateRoute>
              <AIVoice />
            </PrivateRoute>
          }
        />
        <Route
          path="/add-health-data"
          element={
            <PrivateRoute>
              <AddHealthData />
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  console.log("App component rendering");
  
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
