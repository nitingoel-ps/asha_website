import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Table, Dropdown, Button, Modal, Spinner, Alert } from 'react-bootstrap';
import { Trash2, MoreVertical, AlertOctagon, Edit } from 'lucide-react';
import axiosInstance from '../../../utils/axiosInstance';
import './MedicationDetailView.css';
import { EditMedicationModal } from './EditMedicationModal';

export function MedicationDetailView({ medications, refreshMedications }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
  const prescriber = getLatestFromPastMedications('prescriber');
  const authoredOn = medication.authoredOn || getLatestFromPastMedications('authoredOn');

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { day: "numeric", month: "short", year: "numeric" };
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", options);
  };
  
  const handleStatusChange = async (status) => {
    setNewStatus(status);
    setShowStatusModal(true);
  };
  
  const handleEditMedication = () => {
    setShowEditModal(true);
  };
  
  const handleDeleteMedication = () => {
    setShowDeleteModal(true);
  };
  
  const confirmStatusChange = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await axiosInstance.put(`/medications/${medication.id}/`, {
        ...medication,
        status: newStatus
      });
      setShowStatusModal(false);
      
      // Explicitly refresh data from API
      await refreshMedications();
    } catch (err) {
      console.error('Error updating medication status:', err);
      setError(err.response?.data?.message || 'Failed to update medication status. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const confirmDelete = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await axiosInstance.delete(`/medications/${medication.id}/`);
      setShowDeleteModal(false);
      
      // Explicitly refresh data from API before navigating away
      await refreshMedications();
      navigate('/patient-dashboard/med');
    } catch (err) {
      console.error('Error deleting medication:', err);
      setError(err.response?.data?.message || 'Failed to delete medication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Determine if the medication is editable (user reported)
  const isEditable = medication.is_user_reported || medication.is_user_created;

  return (
    <div className="medication-detail-container">      
      <Card className="detail-card">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h3 className="mb-0">{medication.medication}</h3>
              {isEditable && (
                <span className="user-created-badge">
                  {medication.is_user_created ? 'Added by you' : 'Reported by you'}
                </span>
              )}
            </div>
            <div className="d-flex align-items-center">
              <span className={`status-badge status-${medication.status} me-3`}>
                {medication.status}
              </span>
              <Dropdown>
                <Dropdown.Toggle 
                  as={Button} 
                  variant="light" 
                  size="sm" 
                  className="no-arrow-dropdown"
                  id="dropdown-actions"
                >
                  <MoreVertical size={16} />
                </Dropdown.Toggle>
                <Dropdown.Menu align="end">
                  {isEditable && (
                    <>
                      <Dropdown.Item onClick={handleEditMedication}>
                        <Edit size={16} className="me-2" /> Edit Medication
                      </Dropdown.Item>
                      <Dropdown.Divider />
                    </>
                  )}
                  <Dropdown.Header>Change Status</Dropdown.Header>
                  <Dropdown.Item 
                    onClick={() => handleStatusChange('active')}
                    disabled={medication.status === 'active'}
                  >
                    Active
                  </Dropdown.Item>
                  <Dropdown.Item 
                    onClick={() => handleStatusChange('stopped')}
                    disabled={medication.status === 'stopped'}
                  >
                    Stopped
                  </Dropdown.Item>
                  <Dropdown.Item 
                    onClick={() => handleStatusChange('completed')}
                    disabled={medication.status === 'completed'}
                  >
                    Completed
                  </Dropdown.Item>
                  {isEditable && (
                    <>
                      <Dropdown.Divider />
                      <Dropdown.Item 
                        onClick={handleDeleteMedication} 
                        className="text-danger"
                      >
                        <Trash2 size={16} className="me-2" /> Delete Medication
                      </Dropdown.Item>
                    </>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </div>
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
          
          {medication.medication_explanation && (
            <div className="mt-4">
              <h5>About this Medication</h5>
              <div className="medication-explanation-card">
                <p className="medication-explanation-text">{medication.medication_explanation}</p>
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
      
      {/* Status Change Confirmation Modal */}
      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Change Medication Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <p>Are you sure you want to change the status of <strong>{medication.medication}</strong> to <strong>{newStatus}</strong>?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatusModal(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmStatusChange} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Confirm'}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Medication</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="d-flex align-items-center mb-3">
            <AlertOctagon size={24} className="text-danger me-2" />
            <h5 className="mb-0 text-danger">Warning</h5>
          </div>
          <p>Are you sure you want to delete <strong>{medication.medication}</strong>? This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Edit Medication Modal */}
      <EditMedicationModal 
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        medication={medication}
        onSave={async () => {
          setShowEditModal(false);
          // Ensure we get fresh data after edit
          await refreshMedications();
        }}
      />
    </div>
  );
}
