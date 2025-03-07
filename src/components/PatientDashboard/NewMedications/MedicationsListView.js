import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, ButtonGroup, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import axiosInstance from '../../../utils/axiosInstance';
import './MedicationsListView.css';

export function MedicationsListView({ medications, loading, error, refreshMedications }) {
  const [viewType, setViewType] = useState('active');
  const navigate = useNavigate();
  
  // State for the new medication form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedication, setNewMedication] = useState({
    medication: '',
    dosage: '',
    reason: '',
    prescriber: '',
    authoredOn: new Date().toISOString().split('T')[0],
    patient_instruction: ''
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  
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

  // Update how we handle the medications data
  const sortedMedications = Array.isArray(medications?.list) 
    ? medications.list.sort((a, b) => {
        const dateA = new Date(a.authoredOn || getLatestFromPastMedications(a, 'authoredOn') || 0);
        const dateB = new Date(b.authoredOn || getLatestFromPastMedications(b, 'authoredOn') || 0);
        return dateB - dateA;
      })
    : [];

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
  
  const handleAddMedication = () => {
    setShowAddModal(true);
  };
  
  const handleModalClose = () => {
    setShowAddModal(false);
    setFormError(null);
    setNewMedication({
      medication: '',
      dosage: '',
      reason: '',
      prescriber: '',
      authoredOn: new Date().toISOString().split('T')[0],
      patient_instruction: ''
    });
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewMedication({
      ...newMedication,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setFormError(null);
    
    try {
      await axiosInstance.post('/medications/', {
        ...newMedication,
        status: 'active',  // Default status for new medications
      });
      
      handleModalClose();
      refreshMedications();
    } catch (err) {
      console.error('Error creating medication:', err);
      setFormError(err.response?.data?.message || 'Failed to create medication. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
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
              {medication.is_user_created && (
                <><br /><span className="user-created-badge">Added by you</span></>
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
        <div className="d-flex align-items-center">
          <ButtonGroup className="me-2">
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
          <Button 
            variant="success"
            size="sm"
            onClick={handleAddMedication}
          >
            Add Medication
          </Button>
        </div>
      </div>

      <div className="medications-list">
        {loading ? (
          <div className="text-center mt-4">
            <Spinner animation="border" />
          </div>
        ) : error ? (
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        ) : (viewType === 'active' ? activeMeds : inactiveMeds).length === 0 ? (
          <p className="text-center mt-4 text-muted">
            {viewType === 'active' 
              ? 'No active medications found. Click "Add Medication" to add one.' 
              : 'No past medications found.'}
          </p>
        ) : (
          (viewType === 'active' ? activeMeds : inactiveMeds).map((med) => (
            <MedicationCard key={med.id} medication={med} />
          ))
        )}
      </div>

      {/* Add Medication Modal */}
      <Modal show={showAddModal} onHide={handleModalClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Medication</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formError && (
            <Alert variant="danger">{formError}</Alert>
          )}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Medication Name*</Form.Label>
              <Form.Control 
                type="text" 
                name="medication"
                value={newMedication.medication}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Dosage*</Form.Label>
              <Form.Control 
                type="text" 
                name="dosage"
                value={newMedication.dosage}
                onChange={handleInputChange}
                placeholder="e.g., 10mg daily"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Reason*</Form.Label>
              <Form.Control 
                type="text" 
                name="reason"
                value={newMedication.reason}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Prescriber*</Form.Label>
              <Form.Control 
                type="text" 
                name="prescriber"
                value={newMedication.prescriber}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Prescribed Date*</Form.Label>
              <Form.Control 
                type="date" 
                name="authoredOn"
                value={newMedication.authoredOn}
                onChange={handleInputChange}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Instructions</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3}
                name="patient_instruction"
                value={newMedication.patient_instruction}
                onChange={handleInputChange}
                placeholder="e.g., Take with food"
              />
            </Form.Group>
            <div className="d-grid gap-2">
              <Button 
                variant="primary" 
                type="submit" 
                disabled={submitLoading}
              >
                {submitLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : 'Save Medication'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
