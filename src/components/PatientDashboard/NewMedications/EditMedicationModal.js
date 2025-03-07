import React, { useState } from 'react';
import { Modal, Form, Button, Spinner, Alert } from 'react-bootstrap';
import axiosInstance from '../../../utils/axiosInstance';

export function EditMedicationModal({ show, onHide, medication, onSave }) {
  const [formData, setFormData] = useState({
    medication: medication?.medication || '',
    dosage: medication?.dosage || '',
    reason: medication?.reason || '',
    prescriber: medication?.prescriber || '',
    authoredOn: medication?.authoredOn || new Date().toISOString().split('T')[0],
    patient_instruction: medication?.patient_instruction || '',
    status: medication?.status || 'active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validated, setValidated] = useState(false);

  // Reset form when medication changes
  React.useEffect(() => {
    if (medication) {
      // Get the most recent values for fields that might be in past_medications
      const getLatestValue = (fieldName) => {
        if (medication[fieldName]) {
          return medication[fieldName];
        }
        
        if (!medication.past_medications || medication.past_medications.length === 0) {
          return '';
        }
        
        // Sort past_medications by authoredOn date in descending order
        const sortedPastMeds = [...medication.past_medications].sort((a, b) => {
          const dateA = new Date(a.authoredOn || 0);
          const dateB = new Date(b.authoredOn || 0);
          return dateB - dateA;
        });
        
        // Return the field from the most recent record
        return sortedPastMeds[0][fieldName] || '';
      };

      const formattedDate = medication.authoredOn 
        ? new Date(medication.authoredOn).toISOString().split('T')[0]
        : getLatestValue('authoredOn') 
          ? new Date(getLatestValue('authoredOn')).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

      setFormData({
        medication: medication.medication || '',
        dosage: medication.dosage || getLatestValue('dosage') || '',
        reason: medication.reason || '',
        prescriber: medication.prescriber || getLatestValue('prescriber') || '',
        authoredOn: formattedDate,
        patient_instruction: medication.patient_instruction || getLatestValue('patient_instruction') || '',
        status: medication.status || 'active',
      });
    }
  }, [medication]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await axiosInstance.put(`/medications/${medication.id}/`, {
        ...medication,
        ...formData,
        is_user_reported: true, // Ensure the flag remains set
      });
      
      // Call onSave after successful API call
      if (typeof onSave === 'function') {
        await onSave();
      }
    } catch (err) {
      console.error('Error updating medication:', err);
      setError(err.response?.data?.message || 'Failed to update medication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="lg"
      backdrop="static"
      className="medication-edit-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>Edit Medication</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form noValidate validated={validated} onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Medication Name <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              name="medication"
              value={formData.medication}
              onChange={handleChange}
              required
              placeholder="Enter medication name"
            />
            <Form.Control.Feedback type="invalid">
              Please provide a medication name.
            </Form.Control.Feedback>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Dosage <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              name="dosage"
              value={formData.dosage}
              onChange={handleChange}
              placeholder="e.g., 10mg daily"
              required
            />
            <Form.Control.Feedback type="invalid">
              Please provide the dosage information.
            </Form.Control.Feedback>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Reason <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="Why are you taking this medication?"
              required
            />
            <Form.Control.Feedback type="invalid">
              Please provide a reason for taking this medication.
            </Form.Control.Feedback>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Prescriber <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              name="prescriber"
              value={formData.prescriber}
              onChange={handleChange}
              placeholder="Doctor or healthcare provider name"
              required
            />
            <Form.Control.Feedback type="invalid">
              Please provide the prescriber's name.
            </Form.Control.Feedback>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Prescribed Date <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="date"
              name="authoredOn"
              value={formData.authoredOn}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              required
            />
            <Form.Control.Feedback type="invalid">
              Please provide a valid prescription date.
            </Form.Control.Feedback>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Instructions</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="patient_instruction"
              value={formData.patient_instruction}
              onChange={handleChange}
              placeholder="How do you take this medication? (optional)"
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Status <span className="text-danger">*</span></Form.Label>
            <Form.Select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="active">Active</option>
              <option value="stopped">Stopped</option>
              <option value="completed">Completed</option>
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading}>
          {loading ? <Spinner animation="border" size="sm" /> : 'Save Changes'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
