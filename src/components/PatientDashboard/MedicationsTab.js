import React, { useState } from "react";
import { Card, Table, Accordion } from "react-bootstrap";
import './MedicationsTab.css'; // Import the CSS file

function MedicationsTab({ medications }) {
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
          <Card.Text className="medications-summary">
            {medications.summary}
          </Card.Text>
        </Card.Body>
      </Card>
      <Table striped bordered hover className="mt-4">
        <thead>
          <tr>
            <th>Medication</th>
            <th>Patient Instruction</th>
            <th>Explanation</th>
            <th>Authored On</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedMedications.map((med) => {
            const isExpanded = expandedRows[med.id];
            const rowClass = med.status === "stopped" || med.status === "completed" ? "inactive-medication" : "";
            const hasPastMedications = med.past_medications && med.past_medications.length > 0;

            return (
              <React.Fragment key={med.id}>
                <tr className={rowClass} onClick={() => toggleRow(med.id)}>
                  <td>
                    {hasPastMedications && (
                      <span className={`rolldown-icon ${isExpanded ? "expanded" : ""}`}>&gt;</span>
                    )}
                    {med.medication}
                  </td>
                  <td>{med.patient_instruction || "N/A"}</td>
                  <td>{med.medication_explanation || "N/A"}</td>
                  <td>{formatDate(med.authoredOn)}</td>
                  <td>{med.status}</td>
                </tr>
                {isExpanded && hasPastMedications && (
                  <tr>
                    <td colSpan="5">
                      <h5>Previous Prescriptions</h5>
                      <Table striped bordered hover>
                        <tbody>
                          {med.past_medications.map((pastMed) => (
                            <tr key={pastMed.id} className={pastMed.status === "stopped" || pastMed.status === "completed" ? "inactive-medication" : ""}>
                              <td>{pastMed.medication}</td>
                              <td>{pastMed.patient_instruction || "N/A"}</td>
                              <td>{pastMed.medication_explanation || "N/A"}</td>
                              <td>{formatDate(pastMed.authoredOn)}</td>
                              <td>{pastMed.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}

export default MedicationsTab;