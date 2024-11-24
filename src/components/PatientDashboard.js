import React, { useEffect, useState } from "react";
import { Tabs, Tab, Card, Container, Spinner, Alert } from "react-bootstrap";
import ConditionsTab from "./PatientDashboard/ConditionsTab";
import ProceduresTab from "./PatientDashboard/ProceduresTab";
import MedicationsTab from "./PatientDashboard/MedicationsTab";
import DiagnosticReportsTab from "./PatientDashboard/DiagnosticReportsTab";
import axiosInstance from "../utils/axiosInstance";
import { Activity, Pill, FileText, Clipboard, Microscope } from 'lucide-react';

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
    <div className="dashboard-container">
        <Card className="mb-4">
            <Card.Header>
                <div className="flex items-center justify-between">
                    <Card.Title>Patient Dashboard</Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">
                        Welcome back, {patientData.demographics.name}
                    </Card.Subtitle>
                </div>
            </Card.Header>
            <Card.Body>
                <Tabs defaultActiveKey="summary" id="patient-dashboard-tabs" className="mt-4">
                <Tab eventKey="summary" title={<><Activity size={16} /> Summary</>}>
                    <Alert className="mt-3">
                        {patientData.overall_summary}
                    </Alert>
                    <Card className="mb-3">
                        <Card.Body>
                        <Card.Title>Recent Procedures</Card.Title>
                        <ul>
                            {patientData.procedures.list.slice(0, 2).map((procedure) => (
                            <li key={procedure.id}>
                                {procedure.text} ({procedure.performedDateTime || 'Unknown'})
                            </li>
                            ))}
                        </ul>
                        </Card.Body>
                    </Card>
                    <Card>
                        <Card.Body>
                        <Card.Title>Current Medications</Card.Title>
                        <ul>
                            {patientData.medication_requsts.list.entry.map((medication) => (
                            <li key={medication.resource.id}>
                                {medication.resource.medicationReference.display} (Started: {medication.resource.authoredOn})
                            </li>
                            ))}
                        </ul>
                        </Card.Body>
                    </Card>
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