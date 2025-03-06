import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, ButtonGroup } from 'react-bootstrap';
import './MedicationsListView.css';

export function MedicationsListView({ medications }) {
  const [viewType, setViewType] = useState('active');
  const navigate = useNavigate();
  
  console.log("MedicationsListView: Rendered with medications:", medications?.list?.length);

  // Function to get any field from past_medications if it's not available
  const getLatestFromPastMedications = (medication, fieldName) => {
    if (medication[fieldName]) {
      return medication[fieldName];
    }
    
    if (!medication.past_medications || medication.past_medications.length === 0) {
      return null;
    }
    
    // Sort past_medications by authoredOn date in descending order
    const sortedPastMeds = [...medication.past_medications].sort((a, b) => {
      const dateA = new Date(a.authoredOn || 0);
      const dateB = new Date(b.authoredOn || 0);
      return dateB - dateA;
    });
    
    // Return the field from the most recent record
    return sortedPastMeds[0][fieldName];
  };

  const sortedMedications = medications?.list?.sort((a, b) => {
    const dateA = new Date(a.authoredOn || getLatestFromPastMedications(a, 'authoredOn') || 0);
    const dateB = new Date(b.authoredOn || getLatestFromPastMedications(b, 'authoredOn') || 0);
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

  const MedicationCard = ({ medication }) => {
    const patientInstruction = getLatestFromPastMedications(medication, 'patient_instruction');
    const prescriber = getLatestFromPastMedications(medication, 'prescriber');
    const authoredOn = medication.authoredOn || getLatestFromPastMedications(medication, 'authoredOn');
    
    return (
      <Card 
        className="medication-card mb-3" 
        onClick={() => handleMedicationClick(medication.id)}
      >
        <Card.Body>
          <div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">{medication.medication}</h5>
              <span className={`status-badge status-${medication.status}`}>
                {medication.status}
              </span>
            </div>
            <p className="text-muted mb-1">
              {patientInstruction || 'No specific instructions'}
            </p>
            <small className="text-muted">
              Prescribed: {formatDate(authoredOn)}
              {prescriber && (
                <><br />By: {prescriber}</>
              )}
              {medication.reason && (
                <><br />Reason: {medication.reason}</>
              )}
            </small>
          </div>
        </Card.Body>
      </Card>
    );
  };

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
