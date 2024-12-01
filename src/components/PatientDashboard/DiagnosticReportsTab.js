import React, { useState } from "react";
import { Card, Table, Button, Collapse } from "react-bootstrap";

function DiagnosticReportsTab({ diagnosticReports }) {
  const [expandedReportId, setExpandedReportId] = useState(null);

  // Function to toggle a report's observations
  const toggleObservations = (reportId) => {
    setExpandedReportId((prevId) => (prevId === reportId ? null : reportId));
  };

  return (
    <>
      {/* Diagnostic Reports Summary */}
      <Card className="mt-4">
        <Card.Body>
          <Card.Title>Diagnostic Reports Summary</Card.Title>
          <Card.Text
            style={{
              whiteSpace: "pre-wrap", // Preserve line breaks and wrap long text
            wordWrap: "break-word", // Prevent words from overflowing
              maxHeight: "200px", // Set a maximum height for vertical scrolling
              overflowY: "auto", // Enable vertical scrolling when content exceeds maxHeight
            }}
          >
            {diagnosticReports.summary}
          </Card.Text>
        </Card.Body>
      </Card>

      {/* Diagnostic Reports Table */}
      <Table striped bordered hover className="mt-4">
        <thead>
          <tr>
            <th>Report</th>
            <th>Issued Date</th>
            <th>Status</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          {diagnosticReports.list.map((report) => (
            <React.Fragment key={report.id}>
              <tr>
                <td>
                  {/* Clicking the report toggles observations */}
                  <Button
                    variant="link"
                    className="text-start"
                    style={{ textDecoration: "underline", cursor: "pointer" }}
                    onClick={() => toggleObservations(report.id)}
                  >
                    {report.text}
                  </Button>
                </td>
              <td>{report.issued || "N/A"}</td>
              <td>{report.status}</td>
              <td>{report.categories || "N/A"}</td>
            </tr>
              {/* Observations Row */}
              <tr>
                <td colSpan={4}>
                  <Collapse in={expandedReportId === report.id}>
                    <div>
                      {report.observations.length > 0 ? (
                        <Table bordered size="sm">
                          <thead>
                            <tr>
                              <th>Observation</th>
                              <th>Value (Quantity)</th>
                              <th>Value (String)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.observations.map((obs) => (
                              <tr key={obs.id}>
                                <td>{obs.text || "N/A"}</td>
                                <td>{obs.valueQuantity || "N/A"}</td>
                                <td>{obs.valueString || "N/A"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      ) : (
                        <p className="text-muted m-2">
                          No observations available for this report.
                        </p>
                      )}
                    </div>
                  </Collapse>
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </Table>
    </>
  );
}

export default DiagnosticReportsTab;