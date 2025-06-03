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
import { LoggedInNavbar } from './components/Navigation';
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
import WebSocketVoice from './components/WebSocketVoice/WebSocketVoice';
import NewVoiceChat from './components/NewVoiceChat/NewVoiceChat';
import Appointments from './components/Appointments/Appointments';
import RegistrationFlow from './components/NewRegistration/RegistrationFlow';
import HealthPriorities from './components/HealthPriorities/HealthPriorities';
import HealthPriorityDetail from './components/HealthPriorities/HealthPriorityDetail';
import WebRTCVoiceChat from './components/WebRTCVoiceChat/WebRTCVoiceChat';
import JoinWaitlistPage from './components/Waitlist/JoinWaitlistPage';

import './theme.css';
import './components/shared/TabStyling.css';

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
      {/* {isAuthenticated ? <LoggedInNavbar /> : <LoggedOutNavbar />} */}
      {isAuthenticated && <LoggedInNavbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join-waitlist" element={<JoinWaitlistPage />} />
        <Route path="/old-register" element={<Register />} />
        <Route path="/register" element={<RegistrationFlow />} />
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
        <Route 
          path="/health-priorities" 
          element={
            <PrivateRoute>
              <HealthPriorities />
            </PrivateRoute>
          }
        />
        <Route 
          path="/health-priorities/:priorityId" 
          element={
            <PrivateRoute>
              <HealthPriorityDetail />
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
          path="/ai-chat"
          element={
            <PrivateRoute>
              <AIChat />
            </PrivateRoute>
          }
        />
        <Route
          path="/ai-chat/:sessionId"
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
          path="/websocket-voice"
          element={
            <PrivateRoute>
              <WebSocketVoice />
            </PrivateRoute>
          }
        />
        <Route
          path="/websocket-voice/:sessionId"
          element={
            <PrivateRoute>
              <WebSocketVoice />
            </PrivateRoute>
          }
        />
        <Route
          path="/new-voice-chat"
          element={
            <PrivateRoute>
              <NewVoiceChat />
            </PrivateRoute>
          }
        />
        <Route
          path="/new-voice-chat/:sessionId"
          element={
            <PrivateRoute>
              <NewVoiceChat />
            </PrivateRoute>
          }
        />
        <Route
          path="/webrtc-voice-chat"
          element={
            <PrivateRoute>
              <WebRTCVoiceChat />
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
        <Route
          path="/appointments/*"
          element={
            <PrivateRoute>
              <Appointments />
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
