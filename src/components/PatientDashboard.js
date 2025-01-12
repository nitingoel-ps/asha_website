import React, { useEffect, useState } from "react";
import { Card, Container, Spinner } from "react-bootstrap";
import { Activity, Pill, FileText, Clipboard, Microscope, Syringe } from "lucide-react";
import ConditionsTab from "./PatientDashboard/ConditionsTab";
import ChartsTab from "./PatientDashboard/ChartsTab";
import ProceduresTab from "./PatientDashboard/ProceduresTab";
import MedicationsTab from "./PatientDashboard/MedicationsTab";
import DiagnosticReportsTab from "./PatientDashboard/DiagnosticReportsTab";
import ObservationsTab from "./PatientDashboard/ObservationsTab";
import ChatTab from "./PatientDashboard/ChatTab";
import EncountersTab from "./PatientDashboard/EncountersTab";
import VitalSignsTab from "./PatientDashboard/VitalSignsTab";
import SummaryTab from "./PatientDashboard/SummaryTab";
import ImmunizationsTab from "./PatientDashboard/ImmunizationsTab";
import axiosInstance from "../utils/axiosInstance";
import { useNavigate } from "react-router-dom";
import "../styles/PatientDashboard.css";

function PatientDashboard() {
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [chatMessages, setChatMessages] = useState([
    {
      type: "ai",
      text: "Welcome to your healthcare assistant! How can I help you today?",
      isStreaming: false,
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null); // Add this new state
  const navigate = useNavigate();

  // Add this new handler function
  const handleNavigateToReport = (reportId) => {
    setSelectedReportId(reportId);
    setActiveTab("diagnostic-reports");
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

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard-summary":
        return <SummaryTab 
          vitals={patientData.vitals}
          overallSummary={patientData.overall_summary}
          medications={patientData.medication_requsts}
          diagnosticReports={patientData.diagnostic_reports}
          charts={patientData.important_charts}
          onNavigateToReport={handleNavigateToReport} // Add this prop
        />;
      case "summary":
        return <ChatTab 
          suggestedQuestions={patientData.suggested_questions?.research_topics || []} 
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          isThinking={isThinking}
          setIsThinking={setIsThinking}
        />;
      case "charts":
        return <ChartsTab charts={patientData.important_charts} />;
      case "conditions":
        return <ConditionsTab conditions={patientData.conditions} />;
      case "procedures":
        return <ProceduresTab procedures={patientData.procedures} />;
      case "medications":
        return <MedicationsTab medications={patientData.medication_requsts} />;
      case "diagnostic-reports":
        return <DiagnosticReportsTab 
          diagnosticReports={patientData.diagnostic_reports}
          initialReportId={selectedReportId} // Add this prop
        />;
      case "observations":
        return <ObservationsTab observations={patientData.all_observations} />;
      case "encounters":
        return <EncountersTab 
          encounters={patientData.encounters} 
          onNavigateToReport={handleNavigateToReport}  // Add this prop
        />;
      case "vital-signs":
        return <VitalSignsTab vitals={patientData.vitals} />;
      case "immunizations":
        return <ImmunizationsTab immunizations={patientData.immunizations} />;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      <Card className="full-width-card">
        <Card.Header>
          <Card.Title>Patient Dashboard</Card.Title>
        </Card.Header>
        <Card.Body className="d-flex p-0" style={{ width: '100%', height: '100%' }}>
          <div className="left-nav">
            <div className={`nav-item ${activeTab === "dashboard-summary" ? "active" : ""}`} onClick={() => setActiveTab("dashboard-summary")}>
              <Activity size={16} /> Summary
            </div>
            <div className={`nav-item ${activeTab === "summary" ? "active" : ""}`} onClick={() => setActiveTab("summary")}>
              <Activity size={16} /> Chat
            </div>
            <div className={`nav-item ${activeTab === "charts" ? "active" : ""}`} onClick={() => setActiveTab("charts")}>
              <Clipboard size={16} /> Charts
            </div>
            <div className={`nav-item ${activeTab === "conditions" ? "active" : ""}`} onClick={() => setActiveTab("conditions")}>
              <Clipboard size={16} /> Conditions
            </div>
            <div className={`nav-item ${activeTab === "procedures" ? "active" : ""}`} onClick={() => setActiveTab("procedures")}>
              <FileText size={16} /> Procedures
            </div>
            <div className={`nav-item ${activeTab === "medications" ? "active" : ""}`} onClick={() => setActiveTab("medications")}>
              <Pill size={16} /> Medications
            </div>
            <div className={`nav-item ${activeTab === "diagnostic-reports" ? "active" : ""}`} onClick={() => setActiveTab("diagnostic-reports")}>
              <Microscope size={16} /> Diagnostic Reports
            </div>
            <div className={`nav-item ${activeTab === "observations" ? "active" : ""}`} onClick={() => setActiveTab("observations")}>
              <Microscope size={16} /> All Labs
            </div>
            <div className={`nav-item ${activeTab === "encounters" ? "active" : ""}`} onClick={() => setActiveTab("encounters")}>
              <Microscope size={16} /> Encounters
            </div>
            <div className={`nav-item ${activeTab === "vital-signs" ? "active" : ""}`} onClick={() => setActiveTab("vital-signs")}>
              <Microscope size={16} /> Vital Signs
            </div>
            <div className={`nav-item ${activeTab === "immunizations" ? "active" : ""}`} onClick={() => setActiveTab("immunizations")}>
              <Syringe size={16} /> Immunizations
            </div>
          </div>
          <div className="main-display">
            {renderTabContent()}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

export default PatientDashboard;