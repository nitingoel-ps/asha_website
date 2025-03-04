import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Row, Col, Spinner, Badge } from 'react-bootstrap';
import { ArrowLeft, Save, MapPin, Flag } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosInstance';
import { format } from 'date-fns';
import './Symptoms.css';

const CreateSymptomLog = () => {
  const navigate = useNavigate();
  const { symptomId } = useParams();
  const [symptom, setSymptom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [validated, setValidated] = useState(false);
  
  const [formData, setFormData] = useState({
    symptom_id: symptomId,
    severity: '',
    onset_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_time: '',
    triggers: '',
    notes: ''
  });

  useEffect(() => {
    fetchSymptomDetails();
  }, [symptomId]);

  const fetchSymptomDetails = async () => {
    try {
      // Updated to use the RESTful endpoint
      const response = await axiosInstance.get(`/symptoms/${symptomId}/`);
      console.log('Symptom Details Response:', response.data);
      
      // Handle direct response or nested response
      const symptomData = response.data.symptoms?.[0] || response.data;
      
      if (symptomData) {
        setSymptom(symptomData);
      } else {
        setError('Symptom not found');
      }
    } catch (err) {
      console.error('Error fetching symptom details:', err);
      setError('Failed to load symptom details');
    } finally {
      setLoading(false);
    }
  };

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

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        symptom_id: parseInt(symptomId),
        severity: parseInt(formData.severity),
        end_time: formData.end_time || null
      };
      
      console.log('Creating symptom log with payload:', payload);
      // Updated to use the RESTful endpoint
      const response = await axiosInstance.post('/symptom-logs/', payload);
      console.log('Create log response:', response.data);
      
      navigate(`/patient-dashboard/symptoms/${symptomId}`);
    } catch (err) {
      console.error('Error creating symptom log:', err);
      setError('Failed to save symptom log. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Add a new function to render priority level badge
  const getPriorityDisplay = (priority) => {
    if (!priority) return null;
    
    let priorityText;
    let variant;
    
    if (priority <= 3) {
      priorityText = "High Priority";
      variant = "danger";
    } else if (priority <= 6) {
      priorityText = "Medium Priority";
      variant = "warning";
    } else {
      priorityText = "Low Priority";
      variant = "info";
    }
    
    return <Badge bg={variant} className="priority-badge">{priorityText}</Badge>;
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading symptom details...</p>
      </div>
    );
  }

  if (!symptom && !loading) {
    return (
      <Alert variant="danger" className="my-4">
        Symptom not found. Please go back and select a valid symptom.
      </Alert>
    );
  }

  return (
    <div>
      <div className="d-flex align-items-center mb-2 symptom-detail-header">
        <Button 
          variant="outline-secondary" 
          className="me-3 back-button"
          onClick={() => navigate(`/patient-dashboard/symptoms/${symptomId}`)}
        >
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h2 className="mb-0 d-flex align-items-center">
            Log New Episode
          </h2>
        </div>
      </div>

      {/* Add symptom information card at the top */}
      {symptom && !error && !loading && (
        <Card className="mb-4 symptom-info-card">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h3 className="mb-1 d-flex align-items-center">
                  {symptom.name}
                  {symptom.priority_order && symptom.priority_order <= 3 && (
                    <Badge bg="danger" pill className="ms-2 priority-badge">
                      High Priority
                    </Badge>
                  )}
                </h3>
                {symptom.body_location && (
                  <div className="text-muted d-flex align-items-center mb-2">
                    <MapPin size={14} className="me-1" /> {symptom.body_location}
                  </div>
                )}
                {symptom.description && (
                  <p className="text-muted mb-0">{symptom.description}</p>
                )}
              </div>
              {symptom.priority_order && (
                <div className="ms-3">
                  <div className="d-flex align-items-center">
                    <Flag size={16} className="me-1 text-primary" />
                    <span>Priority: {symptom.priority_order}/10</span>
                  </div>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      )}

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Form noValidate validated={validated} onSubmit={handleSubmit}>
            <Form.Group className="mb-4 severity-selector">
              <Form.Label>How severe is this symptom?*</Form.Label>
              <Form.Select
                name="severity"
                value={formData.severity}
                onChange={handleInputChange}
                required
              >
                <option value="">Select severity</option>
                <option value="1" className="severity-option-1">1 - Very Mild (Barely noticeable)</option>
                <option value="2" className="severity-option-2">2 - Mild (Noticeable but manageable)</option>
                <option value="3" className="severity-option-3">3 - Moderate (Affects daily activities)</option>
                <option value="4" className="severity-option-4">4 - Severe (Significantly limiting)</option>
                <option value="5" className="severity-option-5">5 - Very Severe (Debilitating)</option>
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                Please select the severity level.
              </Form.Control.Feedback>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>When did it start?*</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="onset_time"
                    value={formData.onset_time}
                    onChange={handleInputChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    Please provide the start time.
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>When did it end? (Leave blank if ongoing)</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>What might have triggered it?</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="triggers"
                value={formData.triggers}
                onChange={handleInputChange}
                placeholder="Examples: Certain food, stress, weather, medication, etc."
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Additional Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Add any other details about this episode (symptoms, actions taken, etc.)"
              />
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button
                variant="secondary"
                className="me-2"
                onClick={() => navigate(`/patient-dashboard/symptoms/${symptomId}`)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save size={16} className="me-1" />
                    Save Log Entry
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

export default CreateSymptomLog;