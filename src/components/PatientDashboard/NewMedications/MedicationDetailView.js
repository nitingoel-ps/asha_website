import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Table } from 'react-bootstrap';
import './MedicationDetailView.css';

export function MedicationDetailView({ medications }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  console.log("MedicationDetailView: Looking for medication with id:", id);
  console.log("Available medications:", medications?.list);
  
  // Convert id to number since params are strings but our IDs might be numbers
  const medicationId = parseInt(id, 10);
  const medication = medications?.list?.find(med => med.id === medicationId || med.id === id);

  if (!medication) {
    return (
      <div className="medication-detail-container">
        <div>Medication not found. ID: {id}</div>
      </div>
    );
  }

  const getLatestFromPastMedications = (fieldName) => {
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

  const patientInstruction = getLatestFromPastMedications('patient_instruction');
  const dosageInstruction = getLatestFromPastMedications('dosageInstruction');
  const prescriber = getLatestFromPastMedications('prescriber');
  const authoredOn = medication.authoredOn || getLatestFromPastMedications('authoredOn');

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { day: "numeric", month: "short", year: "numeric" };
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", options);
  };

  return (
    <div className="medication-detail-container">      
      <Card className="detail-card">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="mb-0">{medication.medication}</h3>
            <span className={`status-badge status-${medication.status}`}>
              {medication.status}
            </span>
          </div>
        </Card.Header>
        
        <Card.Body>
          <div className="medication-details">
            <div className="medication-detail-item">
              <div className="medication-detail-label">Instructions</div>
              <div className="medication-detail-value">{patientInstruction || "No specific instructions"}</div>
            </div>
            
            <div className="medication-detail-item">
              <div className="medication-detail-label">Prescriber</div>
              <div className="medication-detail-value">{prescriber || "Unknown"}</div>
            </div>
            
            <div className="medication-detail-item">
              <div className="medication-detail-label">Prescribed On</div>
              <div className="medication-detail-value">{formatDate(authoredOn)}</div>
            </div>
            
            <div className="medication-detail-item">
              <div className="medication-detail-label">Status</div>
              <div className="medication-detail-value">{medication.status}</div>
            </div>
            
            <div className="medication-detail-item">
              <div className="medication-detail-label">Reason</div>
              <div className="medication-detail-value">{medication.reason || "Not specified"}</div>
            </div>
          </div>
          
          {dosageInstruction && (
            <div className="mt-4">
              <h5>Dosage Instructions</h5>
              <div className="table-responsive mt-3">
                <Table bordered>
                  <tbody>
                    {typeof dosageInstruction === 'string' ? (
                      <tr>
                        <td>{dosageInstruction}</td>
                      </tr>
                    ) : (
                      Object.entries(dosageInstruction).map(([key, value]) => (
                        <tr key={key}>
                          <td className="fw-bold">{key}</td>
                          <td>{typeof value === 'object' ? JSON.stringify(value) : value}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
          
          {medication.past_medications && medication.past_medications.length > 0 && (
            <div className="mt-4">
              <h5>History</h5>
              <div className="history-cards mt-3">
                {medication.past_medications.map((pastMed, index) => (
                  <div key={index} className="history-card">
                    <div className="history-card-date">
                      {formatDate(pastMed.authoredOn)}
                    </div>
                    <div className="history-card-details">
                      <div className="history-card-content">
                        <div className="history-card-row">
                          <span className="history-label">Status:</span> 
                          <span className={`status-badge status-${pastMed.status?.toLowerCase() || 'unknown'}`}>
                            {pastMed.status || "Unknown"}
                          </span>
                        </div>
                        <div className="history-card-row">
                          <span className="history-label">Prescriber:</span> 
                          <span>{pastMed.prescriber || "Unknown"}</span>
                        </div>
                        {pastMed.patient_instruction && (
                          <div className="history-card-row history-instruction-row">
                            <span className="history-label">Instructions:</span> 
                            <span className="history-instruction">{pastMed.patient_instruction}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
