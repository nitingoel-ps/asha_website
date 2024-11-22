import React, { useEffect, useState } from "react";
import { Tabs, Tab, Container, Spinner } from "react-bootstrap";
import ConditionsTab from "./PatientDashboard/ConditionsTab";
import ProceduresTab from "./PatientDashboard/ProceduresTab";
import MedicationsTab from "./PatientDashboard/MedicationsTab";
import DiagnosticReportsTab from "./PatientDashboard/DiagnosticReportsTab";
import axiosInstance from "../utils/axiosInstance";

function PatientDashboard() {
  const [patientData, setPatientData] = useState(null); // To store API response
  const [loading, setLoading] = useState(true); // To track loading state
  const [error, setError] = useState(null); // To track errors

  // Fetch patient data on component mount
  useEffect(() => {
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
  }, []);

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
        <h5 className="text-danger">{error}</h5>
      </Container>
    );
  }

    // Utility function to preserve line feeds in text
    const formatTextWithLineBreaks = (text) => {
        return text.split("\n").map((line, index) => (
          <span key={index}>
            {line}
            <br />
          </span>
        ));
    };

  return (
    <Container className="mt-5">
      <h2>Patient Dashboard</h2>
      <Tabs defaultActiveKey="summary" id="patient-dashboard-tabs" className="mt-4">
        <Tab eventKey="summary" title="Summary">
          <div className="mt-4">
            <h4>Overall Summary</h4>
            <p>{formatTextWithLineBreaks(patientData.overall_summary)}</p>
          </div>
        </Tab>
        <Tab eventKey="conditions" title="Conditions">
          <ConditionsTab conditions={patientData.conditions} />
        </Tab>
        <Tab eventKey="procedures" title="Procedures">
          <ProceduresTab procedures={patientData.procedures} />
        </Tab>
        <Tab eventKey="medications" title="Medications">
          <MedicationsTab medications={patientData.medication_requsts} />
        </Tab>
        <Tab eventKey="diagnostic-reports" title="Diagnostic Reports">
          <DiagnosticReportsTab diagnosticReports={patientData.diagnostic_reports} />
        </Tab>
      </Tabs>
    </Container>
  );
}

export default PatientDashboard;