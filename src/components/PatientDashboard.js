import React, { useEffect, useState, useMemo } from "react";
import { Button, Card, Container, Spinner } from "react-bootstrap";
import { Activity, Pill, FileText, Clipboard, Microscope, Syringe, MessageCircle, BarChart2, Heart, Calendar, ArrowLeft } from "lucide-react";
import ConditionsTab from "./PatientDashboard/ConditionsTab";
import ChartsTab from "./PatientDashboard/ChartsTab";
import ProceduresTab from "./PatientDashboard/ProceduresTab";
import MedicationsTab from "./PatientDashboard/MedicationsTab";
import DiagnosticReportsTab from "./PatientDashboard/DiagnosticReportsTab";
import ObservationsTab from "./PatientDashboard/ObservationsTab";
import ChatTab from "./PatientDashboard/ChatTab";
import EncountersTab from "./PatientDashboard/EncountersTab";
import VisitsTab from "./PatientDashboard/Visits/VisitsTab";
import VitalSignsTab from "./PatientDashboard/VitalSignsTab";
import SummaryTab from "./PatientDashboard/SummaryTab";
import ImmunizationsTab from "./PatientDashboard/ImmunizationsTab";
import MedicalReportsTab from "./PatientDashboard/MedicalReportsTab";
import axiosInstance from "../utils/axiosInstance";
import { useNavigate, useParams, Outlet, Routes, Route, useLocation, Navigate } from "react-router-dom";
import "../styles/PatientDashboard.css";

function PatientDashboard() {
  const location = useLocation();
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    {
      type: "ai",
      text: "Welcome to your healthcare assistant! How can I help you today?",
      isStreaming: false,
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const navigate = useNavigate();
  const memoizedEncounters = useMemo(() => 
    patientData?.encounters?.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    ), [patientData?.encounters]
  );

  // Get current tab from path
  const activeTab = location.pathname === '/patient-dashboard' ? '' 
    : location.pathname.split('/').pop();

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      navigate("/");
    }

    axiosInstance
      .get("/patient-dashboard")
      .then((response) => {
        setPatientData(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to fetch patient data.");
        setLoading(false);
      });
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add useEffect hook to handle component mount and unmount
  useEffect(() => {
    console.log("PatientDashboard mounted");
    return () => {
      console.log("PatientDashboard unmounted");
    };
  }, []);
  // Add this near your other useEffect hooks to see whats changing.
  useEffect(() => {
    console.log('isMobile or activeTab changed:', { isMobile, activeTab });
  }, [isMobile, activeTab]);

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5 text-center">
        <Card>
          <Card.Body>
            <h3 className="text-primary">We're building your dashboard!</h3>
            <p>
              Your dashboard is currently under construction. Once we finish
              processing your uploaded files or fetching data from your medical
              providers, your personalized dashboard will be ready.
            </p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // Update the handleTabChange function
  const handleTabChange = (newTab) => {
    if (newTab === "") {
      // Clear the specific route and show menu
      navigate("/patient-dashboard", { replace: true });
    } else {
      navigate(`/patient-dashboard/${newTab}`);
    }
  };

  const NavigationMenu = () => (
    <div className="nav-menu">
      <div 
        className={`nav-item ${activeTab === "dashboard-summary" ? "active" : ""}`} 
        onClick={() => handleTabChange("dashboard-summary")}
      >
        <BarChart2 size={16} /> Summary
      </div>
      <div className={`nav-item ${activeTab === "summary" ? "active" : ""}`} 
           onClick={() => handleTabChange("summary")}>
        <MessageCircle size={16} /> Chat
      </div>
      <div 
        className={`nav-item ${activeTab === "vital-signs" ? "active" : ""}`} 
        onClick={() => handleTabChange("vital-signs")}
      >
        <Heart size={16} /> Vital Signs
      </div>
      <div 
        className={`nav-item ${activeTab === "immunizations" ? "active" : ""}`} 
        onClick={() => handleTabChange("immunizations")}
      >
        <Syringe size={16} /> Immunizations
      </div>
      <div 
        className={`nav-item ${activeTab === "visits" ? "active" : ""}`} 
        onClick={() => handleTabChange("visits")}
      >
        <Calendar size={16} /> Visits
      </div>      
      <div 
        className={`nav-item ${activeTab === "medical-reports" ? "active" : ""}`} 
        onClick={() => handleTabChange("medical-reports")}
      >
        <FileText size={16} /> Medical Reports
      </div>
      <div 
        className={`nav-item ${activeTab === "charts" ? "active" : ""}`} 
        onClick={() => handleTabChange("charts")}
      >
        <Clipboard size={16} /> Key Lab Results
      </div>
      <div 
        className={`nav-item ${activeTab === "medications" ? "active" : ""}`} 
        onClick={() => handleTabChange("medications")}
      >
        <Pill size={16} /> Medications
      </div>
    </div>
  );

  // Update the Routes section
  return (
    <div className={`dashboard-container ${activeTab ? 'tab-active' : ''}`}>
      {(!activeTab || !isMobile) && <NavigationMenu />}
      {(activeTab || !isMobile) && (
        <div className="content-area">
          {isMobile && activeTab && (
            <Button 
              variant="outline-primary" 
              className="back-button"
              onClick={() => handleTabChange("")}
            >
              <ArrowLeft size={16} /> Back to Menu
            </Button>
          )}
          <div className="tab-content-wrapper">
            <Routes>
              <Route index element={
                isMobile ? null : <Navigate to="dashboard-summary" replace />
              } />
              <Route path="dashboard-summary" element={
                <SummaryTab 
                  vitals={patientData?.vitals}
                  overallSummary={patientData?.overall_summary}
                  medications={patientData?.medication_requsts}
                  diagnosticReports={patientData?.diagnostic_reports}
                  charts={patientData?.important_charts}
                  keyInsights={patientData?.key_insights}
                />
              } />
              <Route path="summary" element={
                <ChatTab 
                  suggestedQuestions={patientData?.suggested_questions?.research_topics || []}
                  chatMessages={chatMessages}
                  setChatMessages={setChatMessages}
                  isThinking={isThinking}
                  setIsThinking={setIsThinking}
                  selectedPersona={selectedPersona}
                  setSelectedPersona={setSelectedPersona}
                />
              } />
              <Route path="vital-signs" element={<VitalSignsTab vitals={patientData?.vitals} />} />
              <Route path="immunizations" element={<ImmunizationsTab immunizations={patientData?.immunizations} />} />
              <Route 
                path="visits/*" 
                element={
                  <VisitsTab encounters={memoizedEncounters || []} />
                } 
              />
              <Route 
                path="medical-reports/*" 
                element={
                  <React.Suspense fallback={<div>Loading...</div>}>
                    <MedicalReportsTab diagnosticReports={patientData?.diagnostic_reports} />
                  </React.Suspense>
                } 
              />
              <Route path="charts" element={<ChartsTab chartData={patientData?.important_charts} />} />
              <Route path="medications" element={<MedicationsTab medications={patientData?.medication_requsts} />} />
            </Routes>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientDashboard;
