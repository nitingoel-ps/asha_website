import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Row, Col, Spinner } from 'react-bootstrap';
import { ArrowLeft, Save, MapPin } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosInstance';
import { format, parseISO } from 'date-fns';
import './Symptoms.css';

// Helper function to format date with timezone offset
const formatDateWithTimezone = (date) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const hours = Math.abs(Math.floor(offset / 60));
  const minutes = Math.abs(offset % 60);
  const sign = offset <= 0 ? '+' : '-';
  const tzOffset = `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return format(d, "yyyy-MM-dd'T'HH:mm") + tzOffset;
};

// Helper function to convert UTC date to local date
const convertUTCToLocal = (utcDate) => {
  if (!utcDate) return '';
  const date = parseISO(utcDate);
  return format(date, "yyyy-MM-dd'T'HH:mm");
};

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
    onset_time: formatDateWithTimezone(new Date()),
    end_time: '',
    triggers: '',
    notes: ''
  });

  const severityOptions = [
    { value: 1, label: "Very Mild", description: "Barely noticeable", color: "info" },
    { value: 2, label: "Mild", description: "Noticeable but manageable", color: "success" },
    { value: 3, label: "Moderate", description: "Affects daily activities", color: "warning" },
    { value: 4, label: "Severe", description: "Significantly limiting", color: "danger" },
    { value: 5, label: "Very Severe", description: "Debilitating", color: "danger-dark" }
  ];

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

  const handleSeveritySelect = (severity) => {
    setFormData({
      ...formData,
      severity: severity
    });
  };
  
  // New function to handle slider clicks
  const handleSliderClick = (e) => {
    const sliderBar = e.currentTarget;
    const rect = sliderBar.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element
    const width = rect.width;
    const clickRatio = x / width;
    
    // Calculate severity based on where user clicked (1-5)
    let newSeverity = Math.ceil(clickRatio * 5);
    if (newSeverity < 1) newSeverity = 1;
    if (newSeverity > 5) newSeverity = 5;
    
    handleSeveritySelect(newSeverity);
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
        // Format both onset_time and end_time with timezone offset
        onset_time: formatDateWithTimezone(formData.onset_time),
        end_time: formData.end_time ? formatDateWithTimezone(formData.end_time) : null,
        triggers: formData.triggers,
        notes: formData.notes
      };
      
      console.log('Creating symptom log with payload:', payload);
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
      <div className="d-flex align-items-center mb-4 symptom-detail-header">
        <Button 
          variant="outline-secondary" 
          className="me-3 back-button"
          onClick={() => navigate(`/patient-dashboard/symptoms/${symptomId}`)}
        >
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h2 className="mb-0">Log New Episode</h2>
          {symptom && (
            <p className="text-muted mb-0 mt-1">
              <span className="d-flex align-items-center">
                <strong>{symptom.name}</strong>
                {symptom.body_location && (
                  <span className="ms-2 d-flex align-items-center">
                    <MapPin size={14} className="me-1" /> {symptom.body_location}
                  </span>
                )}
              </span>
            </p>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Form noValidate validated={validated} onSubmit={handleSubmit}>
            {/* Improved Single-Row Severity Selector */}
            <Form.Group className="mb-4">
              <Form.Label>How severe is this symptom?*</Form.Label>
              
              <div className="severity-range-container mb-3">
                <div 
                  className="severity-slider-bar"
                  onClick={handleSliderClick}
                >
                  {severityOptions.map((option) => (
                    <div 
                      key={option.value}
                      className={`severity-marker ${parseInt(formData.severity) === option.value ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeveritySelect(option.value);
                      }}
                      style={{ left: `${(option.value - 1) * 25}%` }}
                    >
                      <div className={`severity-dot bg-${option.color}`}></div>
                      <div className="severity-value">{option.value}</div>
                      <div className="severity-tooltip">{option.label}</div>
                    </div>
                  ))}
                </div>
                
                <div className="severity-labels-container">
                  <div className="severity-label-mild">Very Mild</div>
                  <div className="severity-label-severe">Very Severe</div>
                </div>
              </div>

              {/* Active Severity Details */}
              {formData.severity && (
                <div className={`selected-severity-details bg-${severityOptions.find(opt => opt.value === parseInt(formData.severity))?.color || 'secondary'}`}>
                  <div className="selected-severity-label">
                    {severityOptions.find(opt => opt.value === parseInt(formData.severity))?.label}
                  </div>
                  <div className="selected-severity-description">
                    {severityOptions.find(opt => opt.value === parseInt(formData.severity))?.description}
                  </div>
                </div>
              )}
              
              {/* Hidden input for form validation */}
              <Form.Control 
                type="hidden" 
                name="severity" 
                value={formData.severity}
                required
                isInvalid={validated && !formData.severity}
              />
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