import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Table } from 'react-bootstrap';
import { ArrowLeft } from 'lucide-react';
import './MedicationDetailView.css';

export function MedicationDetailView({ medications }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const medication = medications?.list?.find(med => String(med.id) === id);
  
  if (!medication) {
    navigate('..');
    return null;
  }
  const formatDate = (dateString) => {
    if (!dateString) return "N/A"; // Return "N/A" if date is missing
    const options = { day: "numeric", month: "short", year: "numeric" };
    const date = new Date(dateString);
    if (dateString.includes("T")) {
      return date.toLocaleDateString("en-US", options);
    } else {
      return date.toLocaleDateString("en-US", options);
    }
  };

  const handleBack = () => {
    navigate('..');
  };

  return (
    <div className="medication-detail-container">

      <Card className="detail-card mb-4">
        <Card.Body>
          <h3>{medication.medication}</h3>
          <div className="medication-info">
            <div className="info-group">
              <label>Status</label>
              <span className={`status-badge status-${medication.status}`}>
                {medication.status}
              </span>
            </div>
            <div className="info-group">
              <label>Prescribed</label>
              <span>{formatDate(medication.authoredOn)}</span>
            </div>
            <div className="info-group">
              <label>Instructions</label>
              <span>{medication.patient_instruction || 'No specific instructions'}</span>
            </div>
            <div className="info-group">
              <label>Details</label>
              <span>{medication.medication_explanation || 'No additional details'}</span>
            </div>
          </div>
        </Card.Body>
      </Card>

      {medication.past_medications?.length > 0 && (
        <Card>
          <Card.Body>
            <h4>Prescription History</h4>
            <Table responsive className="mt-3">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Instructions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {medication.past_medications.map((pastMed) => (
                  <tr key={pastMed.id}>
                    <td>{formatDate(pastMed.authoredOn)}</td>
                    <td>{pastMed.patient_instruction || 'N/A'}</td>
                    <td>
                      <span className={`status-badge status-${pastMed.status}`}>
                        {pastMed.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
