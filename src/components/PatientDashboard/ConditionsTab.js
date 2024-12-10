import React from "react";
import { Card, Table } from "react-bootstrap";
import ObservationGraph from "./ObservationGraph"; // Adjust the path as needed



function ConditionsTab({ conditions }) {
  return (
    <>
      <Card className="mt-4">
        <Card.Body>
          <Card.Title>Conditions Summary</Card.Title>
          <Card.Text style={{ 
            whiteSpace: "pre-wrap",  // Preserve line breaks and wrap long text
            wordWrap: "break-word", // Prevent words from overflowing
            maxHeight: "200px",     // Set a maximum height for vertical scrolling
            overflowY: "auto",      // Enable vertical scrolling when content exceeds maxHeight
          }}>
            {conditions.summary}
          </Card.Text>
        </Card.Body>
      </Card>
   
      <Table striped bordered hover className="mt-4">
        <thead>
          <tr>
            <th>Condition</th>
            <th>Severity</th>
            <th>Verification Status</th>
            <th>Onset Date</th>
          </tr>
        </thead>
        <tbody>
          {conditions.list.map((condition) => (
            <tr key={condition.id}>
              <td>{condition.text}</td>
              <td>{condition.severity || "N/A"}</td>
              <td>{condition.verificationStatus || "N/A"}</td>
              <td>{condition.onsetDateTime || "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

export default ConditionsTab;