// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext'; // Import the AuthProvider
import Home from './components/Home';
import LoggedInHome from './components/Home/LoggedInHome';
import LoggedOutHome from './components/Home/LoggedOutHome';
import Register from './components/Register';
import Login from './components/Login'; // Import Login
import AddProviders from './components/AddProviders'; // We'll create this later
import PatientDashboard from './components/PatientDashboard'; 
import MyDocuments from './components/MyDocuments'; // We'll create this later
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import UploadFiles from "./components/UploadFiles";

import './theme.css';


function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/add-providers" element={
            <PrivateRoute>
              <AddProviders />
            </PrivateRoute>}
          />
          <Route
            path="/upload-files"
            element={
              <PrivateRoute>
                <UploadFiles />
              </PrivateRoute>
            }
          />          
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/my-documents" element={<MyDocuments />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;