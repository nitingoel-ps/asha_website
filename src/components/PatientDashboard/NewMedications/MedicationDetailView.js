import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Table } from 'react-bootstrap';
import { ArrowLeft } from 'lucide-react';
import './MedicationDetailView.css';

const DetailItem = ({ label, value }) => (
  <div className="medication-detail-item">
    <div className="medication-detail-label">{label}</div>
    <div className="medication-detail-value">{value || 'Not Available'}</div>
  </div>
);

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
      <Button variant="link" className="back-button mb-3 ps-0" onClick={handleBack}>
        <ArrowLeft size={16} />
        Back to Medications
      </Button>

      <Card className="detail-card mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="mb-0">{medication.medication}</h2>
            <span className={`status-badge status-${medication.status}`}>
              {medication.status}
            </span>
          </div>
          
          <div className="medication-details">
            <DetailItem label="Prescribed By" value={medication.prescriber} />
            <DetailItem label="Prescribed On" value={formatDate(medication.authoredOn)} />
            {medication.startDate && <DetailItem label="Start Date" value={formatDate(medication.startDate)} />}
            {medication.endDate && <DetailItem label="End Date" value={formatDate(medication.endDate)} />}
            {medication.reason && <DetailItem label="Reason" value={medication.reason} />}
            <DetailItem label="Source" value={medication.source} />
            <DetailItem label="Instructions" value={medication.dosageInstruction || 'No specific instructions'} />
            <DetailItem label="Explanation" value={medication.medication_explanation} />
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
                  <th>Prescribed By</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {medication.past_medications.map((pastMed) => (
                  <tr key={pastMed.id}>
                    <td>{pastMed.prescriber}</td>
                    <td>{formatDate(pastMed.authoredOn)}</td>
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
