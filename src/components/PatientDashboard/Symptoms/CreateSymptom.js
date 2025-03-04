import React, { useState } from 'react';
import { Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosInstance';
import './Symptoms.css';

const CreateSymptom = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    body_location: '',
    priority_order: 5,
    common_triggers: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validated, setValidated] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
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
    try {
      const submissionData = {
        ...formData,
        priority_order: parseInt(formData.priority_order)
      };
      
      console.log('Creating symptom with data:', submissionData);
      
      const response = await axiosInstance.post('/symptoms/', submissionData);
      console.log('Create symptom response:', response.data);
      
      if (onSuccess) onSuccess();
      navigate('/patient-dashboard/symptoms');
    } catch (err) {
      console.error('Error creating symptom:', err);
      setError('Failed to create symptom. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const suggestedBodyLocations = [
    'Head',
    'Chest',
    'Abdomen',
    'Back',
    'Arms',
    'Legs',
    'Joints',
    'Skin',
    'Throat',
    'General/Systemic'
  ];

  const priorityValues = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div>
      <div className="d-flex align-items-center mb-4 symptom-detail-header">
        <Button 
          variant="outline-secondary" 
          className="me-3 back-button"
          onClick={() => navigate('/patient-dashboard/symptoms')}
        >
          <ArrowLeft size={16} />
        </Button>
        <h2 className="mb-0">Add New Symptom</h2>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Form noValidate validated={validated} onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Symptom Name*</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Headache, Cough, Fatigue"
                required
              />
              <Form.Control.Feedback type="invalid">
                Please provide a symptom name.
              </Form.Control.Feedback>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Body Location</Form.Label>
                  <Form.Select
                    name="body_location"
                    value={formData.body_location}
                    onChange={handleInputChange}
                  >
                    <option value="">Select location (optional)</option>
                    {suggestedBodyLocations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Priority (for sorting)</Form.Label>
                  <Form.Select
                    name="priority_order"
                    value={formData.priority_order}
                    onChange={handleInputChange}
                  >
                    {priorityValues.map(value => (
                      <option key={value} value={value}>
                        {value} {value === 1 ? '(Highest)' : value === 10 ? '(Lowest)' : ''}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Higher priority symptoms will appear first in lists
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the symptom (optional)"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Common Triggers</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="common_triggers"
                value={formData.common_triggers}
                onChange={handleInputChange}
                placeholder="List any known triggers (optional)"
              />
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button
                variant="secondary"
                className="me-2"
                onClick={() => navigate('/patient-dashboard/symptoms')}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save size={16} className="me-1" />
                    Save Symptom
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CreateSymptom;
