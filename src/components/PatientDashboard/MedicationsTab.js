import React from "react";
import { Card, Table } from "react-bootstrap";

function MedicationsTab({ medications }) {
  return (
    <>
      <Card className="mt-4">
        <Card.Body>
          <Card.Title>Medications Summary</Card.Title>
          <Card.Text style={{ 
            whiteSpace: "pre-wrap",  // Preserve line breaks and wrap long text
            wordWrap: "break-word", // Prevent words from overflowing
            maxHeight: "200px",     // Set a maximum height for vertical scrolling
            overflowY: "auto",      // Enable vertical scrolling when content exceeds maxHeight
          }}>
            {medications.summary}
          </Card.Text>
        </Card.Body>
      </Card>
      <Table striped bordered hover className="mt-4">
        <thead>
          <tr>
            <th>Medication</th>
            <th>Dosage</th>
            <th>Prescribed On</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {medications.list.map((med) => {
            return (
              <tr key={med.id}>
                <td>{med.medication}</td>
                <td>{med.dosageInstruction || "N/A"}</td>
                <td>{med.authoredOn}</td>
                <td>{med.status}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}

export default MedicationsTab;