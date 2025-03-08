import React, { useEffect, useState, useMemo } from "react";
import { Button, Card, Container, Spinner } from "react-bootstrap";
import { Activity, Pill, FileText, Clipboard, Microscope, Syringe, MessageCircle, BarChart2, Heart, Calendar, ArrowLeft, Mic, FlaskConical, Target } from "lucide-react";
import ConditionsTab from "./PatientDashboard/ConditionsTab";
import ChartsTab from "./PatientDashboard/ChartsTab";
import ProceduresTab from "./PatientDashboard/ProceduresTab";
import MedicationsTab from "./PatientDashboard/MedicationsTab";
import { NewMedicationsTab } from "./PatientDashboard/NewMedications/NewMedicationsTab";
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
import { NewImmunizationsTab } from "./PatientDashboard/NewImmunizations/NewImmunizationsTab";
import VoiceTab from "./PatientDashboard/VoiceTab";
import StreamingVoiceTab from "./PatientDashboard/StreamingVoiceTab";
import LabPanelsTab from './PatientDashboard/LabPanels/LabPanelsTab';
import ObservationDetail from './PatientDashboard/LabPanels/ObservationDetail';
import HealthPrioritiesTab from './PatientDashboard/HealthPriorities/HealthPrioritiesTab';
import HealthPriorityDetail from './PatientDashboard/HealthPriorities/HealthPriorityDetail';
import SymptomsTab from './PatientDashboard/Symptoms/SymptomsTab';

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
  const [voiceMessages, setVoiceMessages] = useState([]);
  const navigate = useNavigate();
  const memoizedEncounters = useMemo(() => 
    patientData?.encounters?.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    ), [patientData?.encounters]
  );

  // Add this near the top of the component
  console.log("PatientDashboard: Current location:", location.pathname);
  
  // Modify the activeTab calculation to log
  const activeTab = location.pathname === '/patient-dashboard' ? '' 
    : location.pathname.split('/').pop();
  console.log("PatientDashboard: Active tab calculated as:", activeTab);

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

  // Update the handleTabChange function to handle nested routes
  const handleTabChange = (newTab) => {
    if (newTab === "") {
      navigate("/patient-dashboard", { replace: true });
    } else {
      navigate(`/patient-dashboard/${newTab}`);
    }
  };

  // Add these new functions to handle back button text and navigation
  const getBackButtonText = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    // Special case for observation detail
    if (pathSegments.includes('observation')) {
      return 'Back to Lab Panels';
    }
    
    // Add special case for health priorities detail
    if (pathSegments.includes('health-priorities') && pathSegments.length > 2) {
      return 'Back to Health Priorities';
    }
    
    // Special case for symptoms detail or create
    if (pathSegments.includes('symptoms') && pathSegments.length > 2) {
      return 'Back to Symptoms';
    }
    
    // If we're in a detail view (has more than 2 segments after patient-dashboard)
    if (pathSegments.length > 2) {
      // Map the parent route to a friendly name
      const parentRouteNames = {
        med: 'Medications',
        visits: 'Visits',
        'medical-reports': 'Medical Reports',
        immunizations: 'Immunizations',
        'lab-panels': 'Lab Panels',
        'health-priorities': 'Health Priorities'
      };
      return `Back to ${parentRouteNames[pathSegments[1]] || 'Menu'}`;
    }
    
    return 'Back to Menu';
  };

  const handleBack = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    // Special case for observation detail
    if (pathSegments.includes('observation')) {
      navigate('/patient-dashboard/lab-panels');
      return;
    }
    
    // Add handling for health priorities detail
    if (pathSegments.includes('health-priorities') && pathSegments.length > 2) {
      navigate('/patient-dashboard/health-priorities');
      return;
    }
    
    // Special case for symptoms routes
    if (pathSegments.includes('symptoms') && pathSegments.length > 2) {
      navigate('/patient-dashboard/symptoms');
      return;
    }
    
    if (pathSegments.length > 2) {
      // Go back to the parent route
      navigate(`/patient-dashboard/${pathSegments[1]}`);
    } else {
      // Go back to main menu
      handleTabChange('');
    }
  };

  const NavigationMenu = () => (
    <div className="nav-menu">
      <div 
        className={`nav-item ${activeTab === "symptoms" ? "active" : ""}`} 
        onClick={() => handleTabChange("symptoms")}
      >
        <Activity size={16} /> Symptoms
      </div>
      <div 
        className={`nav-item ${activeTab === "health-priorities" ? "active" : ""}`} 
        onClick={() => handleTabChange("health-priorities")}
      >
        <Target size={16} /> Health Priorities
      </div>
      <div className={`nav-item ${activeTab === "summary" ? "active" : ""}`} 
           onClick={() => handleTabChange("summary")}>
        <MessageCircle size={16} /> Chat
      </div>
      <div 
        className={`nav-item ${activeTab === "streaming-voice" ? "active" : ""}`} 
        onClick={() => handleTabChange("streaming-voice")}
      >
        <Mic size={16} /> Talk (Testing Streaming)
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
        class={`nav-item ${activeTab === "medical-reports" ? "active" : ""}`} 
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
        className={`nav-item ${activeTab === "med" ? "active" : ""}`} 
        onClick={() => handleTabChange("med")}
      >
        <Pill size={16} /> Medications
      </div>
      <div 
        className={`nav-item ${activeTab === "lab-panels" ? "active" : ""}`} 
        onClick={() => handleTabChange("lab-panels")}
      >
        <FlaskConical size={16} /> Lab Panels
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
              onClick={handleBack}
            >
              <ArrowLeft size={16} /> {getBackButtonText()}
            </Button>
          )}
          <div className="tab-content-wrapper">
            <Routes>
              {console.log("PatientDashboard: Rendering routes")}
              <Route index element={
                isMobile ? null : <Navigate to="health-priorities" replace />
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
              <Route path="vital-signs" element={<VitalSignsTab />} />
              <Route 
                path="immunizations/*" 
                element={
                  <React.Suspense fallback={<div>Loading...</div>}>
                    <NewImmunizationsTab immunizations={patientData?.immunizations} />
                  </React.Suspense>
                } 
              />
              <Route 
                path="visits/*" 
                element={
                  <VisitsTab encounters={memoizedEncounters || []} />
                } 
              />
              <Route 
                path="medical-reports/*" 
                element={
                    <MedicalReportsTab diagnosticReports={patientData?.diagnostic_reports} />
                } 
              />
              <Route path="charts" element={<ChartsTab chartData={patientData?.important_charts} />} />
              <Route 
                path="med/*" 
                element={
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {console.log("PatientDashboard: Rendering medications new route")}
                    <NewMedicationsTab />
                  </React.Suspense>
                } 
              />
              <Route path="voice" element={
                <VoiceTab 
                  messages={voiceMessages} 
                  setMessages={setVoiceMessages}
                />
              } />
              <Route path="streaming-voice" element={<StreamingVoiceTab />} />
              <Route path="lab-panels" element={
                <LabPanelsTab standardPanels={patientData?.all_observations?.standard_panels} />
              } />
              <Route path="observation/:observationId" element={
                <ObservationDetail standardPanels={patientData?.all_observations?.standard_panels} />
              } />
              <Route path="health-priorities" element={
                <HealthPrioritiesTab focusAreas={patientData?.focus_areas || []} />
              } />
              <Route path="health-priorities/:priorityId" element={
                <HealthPriorityDetail focusAreas={patientData?.focus_areas || []} />
              } />
              <Route path="symptoms/*" element={<SymptomsTab />} />
            </Routes>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientDashboard;
