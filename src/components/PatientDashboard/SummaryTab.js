import React from "react";
import { Card, Row, Col, Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import "./SummaryTab.css";

function SummaryTab({ overallSummary = '', medications = { list: [] }, diagnosticReports = { list: [] }, keyInsights = { insights: [] } }) {
  // Get active medications
  const activeMedications = medications?.list?.filter(med => med?.status === 'active') || [];

  // Get most recent diagnostic report
  const mostRecentReport = diagnosticReports?.list?.[0];

  return (
    <div className="summary-tab">
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Health Summary</Card.Title>
          <Card.Text>{overallSummary || 'No summary available'}</Card.Text>
        </Card.Body>
      </Card>

      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Key Insights</Card.Title>
              <ul className="insights-list">
                {(keyInsights?.insights || []).map((insight, index) => (
                  <OverlayTrigger
                    key={index}
                    placement="top"
                    overlay={<Tooltip id={`tooltip-${index}`}>{insight.narration}</Tooltip>}
                  >
                    <li className="insight-item">
                      {insight.heading}
                    </li>
                  </OverlayTrigger>
                ))}
              </ul>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Latest Lab Results</Card.Title>
              {mostRecentReport ? (
                <>
                  <h6>
                    <Button
                      variant="link"
                      className="p-0"
                      style={{ textDecoration: "none" }}
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
          <Card>
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
      </Row>
    </div>
  );
}

export default SummaryTab;
