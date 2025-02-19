import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, ButtonGroup } from 'react-bootstrap';
import './MedicationsListView.css';

export function MedicationsListView({ medications }) {
  const [viewType, setViewType] = useState('active');
  const navigate = useNavigate();
  
  console.log("MedicationsListView: Rendered with medications:", medications?.list?.length);

  const sortedMedications = medications?.list?.sort((a, b) => {
    const dateA = new Date(a.authoredOn);
    const dateB = new Date(b.authoredOn);
    return dateB - dateA;
  }) || [];

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

  const activeMeds = sortedMedications.filter(med => med.status === 'active');
  const inactiveMeds = sortedMedications.filter(med => med.status === 'stopped' || med.status === 'completed');

  const handleMedicationClick = (medId) => {
    navigate(`${medId}`);
  };

  const MedicationCard = ({ medication }) => (
    <Card 
      className="medication-card mb-3" 
      onClick={() => handleMedicationClick(medication.id)}
    >
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h5 className="mb-1">{medication.medication}</h5>
            <p className="text-muted mb-1">
              {medication.patient_instruction || 'No specific instructions'}
            </p>
            <small className="text-muted">
              Prescribed: {formatDate(medication.authoredOn)}
            </small>
          </div>
          <span className={`status-badge status-${medication.status}`}>
            {medication.status}
          </span>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <div className="medications-list-container">
      <div className="medications-header d-flex justify-content-between align-items-center">
        <h2>Medications</h2>
        <ButtonGroup>
          <Button 
            variant={viewType === 'active' ? 'primary' : 'outline-primary'}
            onClick={() => setViewType('active')}
          >
            Active ({activeMeds.length})
          </Button>
          <Button 
            variant={viewType === 'inactive' ? 'primary' : 'outline-primary'}
            onClick={() => setViewType('inactive')}
          >
            Past ({inactiveMeds.length})
          </Button>
        </ButtonGroup>
      </div>

      <div className="medications-list">
        {(viewType === 'active' ? activeMeds : inactiveMeds).map((med) => (
          <MedicationCard key={med.id} medication={med} />
        ))}
      </div>
    </div>
  );
}
