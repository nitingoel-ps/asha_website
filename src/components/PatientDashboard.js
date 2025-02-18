import React, { useEffect, useState } from "react";
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
import { useNavigate, useParams } from "react-router-dom";
import "../styles/PatientDashboard.css";

function PatientDashboard() {
  const { tab, reportId, visitId } = useParams(); // Add visitId to destructuring
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(tab || "dashboard-summary");
  const [chatMessages, setChatMessages] = useState([
    {
      type: "ai",
      text: "Welcome to your healthcare assistant! How can I help you today?",
      isStreaming: false,
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(reportId || null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedPersona, setSelectedPersona] = useState(null); // Add selectedPersona state
  const navigate = useNavigate();

  const handleNavigateToReport = (reportId) => {
    setSelectedReportId(reportId);
    setActiveTab("diagnostic-reports");
    navigate(`/patient-dashboard/diagnostic-reports/${reportId}`);
  };

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
    // If there's a reportId in the URL, set the tab to medical-reports
    if (reportId) {
      setActiveTab('medical-reports');
      setSelectedReportId(reportId);
    } else if (visitId) { // Add this check
      setActiveTab('visits');
    } else if (tab) {
      setActiveTab(tab);
    }
  }, [tab, reportId, visitId]); // Add visitId to dependencies

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

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    navigate(`/patient-dashboard/${newTab}`);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "summary":
        return <ChatTab 
          suggestedQuestions={patientData.suggested_questions?.research_topics || []} 
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          isThinking={isThinking}
          setIsThinking={setIsThinking}
          selectedPersona={selectedPersona} // Pass selectedPersona as a prop
          setSelectedPersona={setSelectedPersona} // Pass setSelectedPersona as a prop
        />;
      case "dashboard-summary":
        return <SummaryTab 
          vitals={patientData.vitals}
          overallSummary={patientData.overall_summary}
          medications={patientData.medication_requsts}
          diagnosticReports={patientData.diagnostic_reports}
          charts={patientData.important_charts}
          onNavigateToReport={handleNavigateToReport}
          keyInsights={patientData.key_insights}
        />;
      case "encounters":
        return <EncountersTab 
          encounters={patientData.encounters} 
          onNavigateToReport={handleNavigateToReport}
        />;
      case "vital-signs":
        return <VitalSignsTab vitals={patientData.vitals} />;
      case "immunizations":
        return <ImmunizationsTab immunizations={patientData.immunizations} />;
      case "diagnostic-reports":
        return <DiagnosticReportsTab 
          diagnosticReports={patientData.diagnostic_reports}
          initialReportId={selectedReportId}
        />;
      case "medical-reports":
        return <MedicalReportsTab diagnosticReports={patientData.diagnostic_reports} />;
      case "charts":
        return <ChartsTab chartData={patientData.important_charts} />;
      case "procedures":
        return <ProceduresTab procedures={patientData.procedures} />;
      case "medications":
        return <MedicationsTab medications={patientData.medication_requsts} />;
      case "conditions":
          return <ConditionsTab conditions={patientData.conditions} />;
        case "observations":
        return <ObservationsTab observations={patientData.all_observations} />;
      case "visits":
        return <VisitsTab encounters={patientData.encounters} />;
      default:
        return null;
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

  const ContentArea = () => (
    <div className="content-area">
      {isMobile && (
        <Button 
          variant="outline-primary" 
          className="back-button"
          onClick={() => handleTabChange("")}
        >
          <ArrowLeft size={16} /> Back to Menu
        </Button>
      )}
      {renderTabContent()}
    </div>
  );

  return (
    <div className={`dashboard-container ${activeTab && isMobile ? 'tab-active' : ''}`}>
      {console.log('PatientDashboard render:', { isMobile, activeTab })}
      {(!isMobile || !activeTab) && (
        <>
          {console.log('NavigationMenu rendering')}
          <NavigationMenu />
        </>
      )}
      {(!isMobile || activeTab) && (
        <>
          {console.log('ContentArea rendering')}
          <ContentArea />
        </>
      )}
    </div>
  );
}

export default PatientDashboard;
