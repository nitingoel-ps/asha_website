import React, { useState } from "react";
import { Card, Table, Button, Collapse, OverlayTrigger, Tooltip } from "react-bootstrap";
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa"; // Import icons from Font Awesome

function DiagnosticReportsTab({ diagnosticReports }) {
  const [expandedReportId, setExpandedReportId] = useState(null);

  // Function to toggle a report's observations
  const toggleObservations = (reportId) => {
    setExpandedReportId((prevId) => (prevId === reportId ? null : reportId));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"; // Return "N/A" if dateString is null or undefined
    const options = { day: "numeric", month: "short", year: "numeric" };
    const date = new Date(dateString);
    if (isNaN(date)) return "N/A"; // Handle invalid dates
    return date.toLocaleDateString("en-US", options);
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
            <th>Source</th>
            <th>Issued Date</th>
            <th>Category</th>
            <th>Conclusion</th>
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
                    {report.report_name}
                  </Button>
                </td>
                <td>{report.source || "N/A"}</td>
                <td>{formatDate(report.report_date)}</td>
              <td>{report.report_type || "N/A"}</td>
              <td>{report.report_summary || "N/A"}</td>              
            </tr>
              {/* Observations Row */}
              <tr>
                <td colSpan={5}>
                  <Collapse in={expandedReportId === report.id}>
                    <div style={{ width: "100%" }}>
                      {report.observations.length > 0 ? (
                        <Table bordered size="sm" className="mb-0">
                          <thead>
                            <tr>
                            <th style={{ width: "20%" }}>Observation</th>
                            <th style={{ width: "15%" }}>Value</th>
                            <th style={{ width: "10%", textAlign: "center" }}>Is Normal</th>
                            <th style={{ width: "55%" }}>Explanation</th>                          
                            </tr>
                          </thead>
                          <tbody>
                            {report.observations.map((obs) => (
                              <tr key={obs.id}>
                                {/* Observation Name with Tooltip */}
                                <td>{obs.name || "N/A"}</td>
                                <td>{obs.value || "N/A"}</td>
                                <td align="center">
                                  {obs.is_normal ? (
                                    <FaCheckCircle style={{ color: "green" }} title="Normal" />
                                  ) : (
                                    <FaExclamationTriangle style={{ color: "red" }} title="Not Normal" />
                                  )}
                                </td>
                                <td>{obs.explanation || "N/A"}</td>                                
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