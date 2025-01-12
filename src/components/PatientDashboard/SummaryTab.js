import React from "react";
import { Card, Row, Col, Button } from "react-bootstrap";
import "./SummaryTab.css";

function SummaryTab({ overallSummary = '', medications = { list: [] }, diagnosticReports = { list: [] }, onNavigateToReport }) {
  // Get active medications
  const activeMedications = medications?.list?.filter(med => med?.status === 'active') || [];

  // Get most recent diagnostic report
  const mostRecentReport = diagnosticReports?.list?.[0];

  const keyInsights = [
    "Blood pressure has been consistently high over the past 3 months",
    "Weight has reduced by 5kg in the last 6 months",
    "Recent blood tests show improvement in cholesterol levels",
    "Due for annual physical examination next month"
  ];

  return (
    <div className="summary-tab">
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Health Summary</Card.Title>
          <Card.Text>{overallSummary || 'No summary available'}</Card.Text>
        </Card.Body>
      </Card>

      <Row className="mb-4">
        <Col md={6}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Active Medications ({activeMedications.length})</Card.Title>
              <div className="medications-list">
                {activeMedications.length > 0 ? (
                  activeMedications.map(med => (
                    <div key={med.id} className="medication-item">
                      <strong>{med.medication}</strong>
                      <div className="medication-dosage">{med.dosageInstruction}</div>
                    </div>
                  ))
                ) : (
                  <p>No active medications</p>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Latest Lab Results</Card.Title>
              {mostRecentReport ? (
                <>
                  <h6>
                    <Button
                      variant="link"
                      className="p-0"
                      style={{ textDecoration: "none" }}
                      onClick={() => onNavigateToReport(mostRecentReport.id)}
                    >
                      {mostRecentReport.report_name}
                    </Button>
                  </h6>
                  <p className="text-muted">
                    {new Date(mostRecentReport.report_date).toLocaleDateString()}
                  </p>
                  <p>{mostRecentReport.report_summary}</p>
                </>
              ) : (
                <p>No recent lab results available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <Card.Title>Key Insights</Card.Title>
          <ul className="insights-list">
            {keyInsights.map((insight, index) => (
              <li key={index} className="insight-item">
                {insight}
              </li>
            ))}
          </ul>
        </Card.Body>
      </Card>
    </div>
  );
}

export default SummaryTab;
