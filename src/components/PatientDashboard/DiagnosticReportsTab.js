import React from "react";
import { Card, Table } from "react-bootstrap";

function DiagnosticReportsTab({ diagnosticReports }) {
  return (
    <>
      <Card className="mt-4">
        <Card.Body>
          <Card.Title>Diagnostic Reports Summary</Card.Title>
          <Card.Text style={{ 
            whiteSpace: "pre-wrap",  // Preserve line breaks and wrap long text
            wordWrap: "break-word", // Prevent words from overflowing
            maxHeight: "200px",     // Set a maximum height for vertical scrolling
            overflowY: "auto",      // Enable vertical scrolling when content exceeds maxHeight
          }}>
            {diagnosticReports.summary}
          </Card.Text>
        </Card.Body>
      </Card>
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
            <tr key={report.id}>
              <td>{report.text}</td>
              <td>{report.issued || "N/A"}</td>
              <td>{report.status}</td>
              <td>{report.categories || "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

export default DiagnosticReportsTab;