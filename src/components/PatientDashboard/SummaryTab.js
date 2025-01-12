import React from "react";
import { Card, Row, Col, Button } from "react-bootstrap";
import { FaHeart, FaWeight, FaChartLine, FaFlask } from "react-icons/fa";
import "./SummaryTab.css";

function SummaryTab({ vitals = [], overallSummary = '', medications = { list: [] }, diagnosticReports = { list: [] }, charts = { charts: [] }, onNavigateToReport }) {
  // Helper function to get latest vital reading
  const getLatestVital = (vitalType) => {
    if (!Array.isArray(vitals)) return null;
    return vitals.find(v => v?.vital_sign === vitalType);
  };

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

  // Helper function to get most recent value from chart data
  const getLatestChartValue = (chartData) => {
    if (!chartData?.points || chartData.points.length === 0) return null;
    
    const sortedPoints = [...chartData.points].sort((a, b) => 
      new Date(b.observationDate) - new Date(a.observationDate)
    );
    
    return {
      value: sortedPoints[0].observationValue,
      date: sortedPoints[0].observationDate,
      uom: chartData.uom
    };
  };

  return (
    <div className="summary-tab">
      <Row className="mb-4">
        <Col md={4}>
          <Card className="vital-summary-card">
            <Card.Body>
              <div className="vital-card-header">
                <Card.Title>Blood Pressure</Card.Title>
                {getLatestVital("Blood Pressure") && (
                  <span className="vital-date">
                    {new Date(getLatestVital("Blood Pressure").date_taken).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="vital-reading-container">
                <FaHeart className="vital-icon" />
                <span className="vital-reading">{getLatestVital("Blood Pressure")?.reading || "N/A"}</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="vital-summary-card">
            <Card.Body>
              <div className="vital-card-header">
                <Card.Title>Weight</Card.Title>
                {getLatestVital("Weight") && (
                  <span className="vital-date">
                    {new Date(getLatestVital("Weight").date_taken).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="vital-reading-container">
                <FaWeight className="vital-icon" />
                <span className="vital-reading">{getLatestVital("Weight")?.reading || "N/A"}</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="vital-summary-card">
            <Card.Body>
              <div className="vital-card-header">
                <Card.Title>BMI</Card.Title>
                {getLatestVital("Body Mass Index") && (
                  <span className="vital-date">
                    {new Date(getLatestVital("Body Mass Index").date_taken).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="vital-reading-container">
                <FaChartLine className="vital-icon" />
                <span className="vital-reading">{getLatestVital("Body Mass Index")?.reading || "N/A"}</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Key Observations from Charts */}
      <Row className="mb-4">
        {charts?.charts?.map((chart, index) => {
          const latestValue = getLatestChartValue(chart);
          return (
            <Col md={4} key={index} className="mb-3">
              <Card className="vital-summary-card">
                <Card.Body>
                  <div className="vital-card-header">
                    <Card.Title>{chart.observationName}</Card.Title>
                    {latestValue && (
                      <span className="vital-date">
                        {new Date(latestValue.date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="vital-reading-container">
                    <FaFlask className="vital-icon" />
                    <span className="vital-reading">
                      {latestValue ? `${latestValue.value} ${latestValue.uom}` : 'N/A'}
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

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
