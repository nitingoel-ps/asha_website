import React from "react";
import { Card, Table } from "react-bootstrap";

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

function ProceduresTab({ procedures }) {
  return (
    <>
      <Card className="mt-4">
        <Card.Body>
          <Card.Title>Procedures Summary</Card.Title>
          <Card.Text style={{ 
            whiteSpace: "pre-wrap",  // Preserve line breaks and wrap long text
            wordWrap: "break-word", // Prevent words from overflowing
            maxHeight: "200px",     // Set a maximum height for vertical scrolling
            overflowY: "auto",      // Enable vertical scrolling when content exceeds maxHeight
          }}>
            {procedures.summary}
          </Card.Text>
        </Card.Body>
      </Card>
      <Table striped bordered hover className="mt-4">
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Performed Date</th>
            <th>Reason</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {procedures.list.map((procedure) => (
            <tr key={procedure.id}>
              <td>{procedure.text}</td>
              <td>{formatDate(procedure.performedDateTime || procedure.start)}</td>
              <td>{procedure.reason || "N/A"}</td>
              <td>{procedure.status}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

export default ProceduresTab;