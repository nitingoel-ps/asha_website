import React from "react";
import { Card, Table } from "react-bootstrap";

function MedicationsTab({ medications }) {
  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return "N/A"; // Handle missing dates
    const options = { day: "numeric", month: "short", year: "numeric" };
    const date = new Date(dateString);
    if (isNaN(date)) return "N/A"; // Handle invalid dates
    return date.toLocaleDateString("en-US", options);
  };

  // Sorting logic: Sort by status and then by date within each status
  const sortedMedications = [...medications.list].sort((a, b) => {
    const statusOrder = { active: 1, stopped: 2, completed: 3 };
    const statusComparison = (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4);

    if (statusComparison !== 0) {
      return statusComparison; // Sort by status
    }

    const dateA = new Date(a.authoredOn);
    const dateB = new Date(b.authoredOn);
    return dateB - dateA; // Sort by date (descending) within the same status
  });

  return (
    <>
      <Card className="mt-4">
        <Card.Body>
          <Card.Title>Medications Summary</Card.Title>
          <Card.Text
            style={{
              whiteSpace: "pre-wrap", // Preserve line breaks and wrap long text
            wordWrap: "break-word", // Prevent words from overflowing
              maxHeight: "200px", // Set a maximum height for vertical scrolling
              overflowY: "auto", // Enable vertical scrolling when content exceeds maxHeight
            }}
          >
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
          {sortedMedications.map((med) => {
            return (
              <tr key={med.id}>
                <td>{med.medication}</td>
                <td>{med.dosageInstruction || "N/A"}</td>
                <td>{formatDate(med.authoredOn)}</td>
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