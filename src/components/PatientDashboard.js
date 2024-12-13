import React, { useEffect, useState } from "react";
import { Tabs, Tab, Card, Container, Spinner } from "react-bootstrap";
import { Activity, Pill, FileText, Clipboard, Microscope } from "lucide-react";
import ConditionsTab from "./PatientDashboard/ConditionsTab";
import ChartsTab from "./PatientDashboard/ChartsTab";
import ProceduresTab from "./PatientDashboard/ProceduresTab";
import MedicationsTab from "./PatientDashboard/MedicationsTab";
import DiagnosticReportsTab from "./PatientDashboard/DiagnosticReportsTab";
import ChatTab from "./PatientDashboard/ChatTab";
import axiosInstance from "../utils/axiosInstance";
import { useNavigate } from "react-router-dom";

function PatientDashboard() {
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

  return (
    <div className="dashboard-container">
      <Card className="mb-4">
        <Card.Header>
          <Card.Title>Patient Dashboard</Card.Title>
        </Card.Header>
        <Card.Body>
          <Tabs defaultActiveKey="summary" id="patient-dashboard-tabs" className="mt-4">
            <Tab eventKey="summary" title={<><Activity size={16} /> Chat</>}>
              <ChatTab suggestedQuestions={patientData.suggested_questions?.research_topics || []} />
            </Tab>
            <Tab eventKey="charts" title={<><Clipboard size={16} /> Charts</>}>
              <ChartsTab charts={patientData.important_charts} />
            </Tab>
            <Tab eventKey="conditions" title={<><Clipboard size={16} /> Conditions</>}>
              <ConditionsTab conditions={patientData.conditions} />
            </Tab>
            <Tab eventKey="procedures" title={<><FileText size={16} /> Procedures</>}>
              <ProceduresTab procedures={patientData.procedures} />
            </Tab>
            <Tab eventKey="medications" title={<><Pill size={16} /> Medications</>}>
              <MedicationsTab medications={patientData.medication_requsts} />
            </Tab>
            <Tab eventKey="diagnostic-reports" title={<><Microscope size={16} /> Diagnostic Reports</>}>
              <DiagnosticReportsTab diagnosticReports={patientData.diagnostic_reports} />
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </div>
  );
}

export default PatientDashboard;