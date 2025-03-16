import React, { useState } from "react";
import { Form, Button, Card, Alert, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { createAppointment } from "../../utils/appointmentsService";
import "./AppointmentForm.css";

function AppointmentForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    participant_name: "",
    start_time: "",
    duration_minutes: 30,
    is_virtual: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Calculate end_time based on start_time and duration
      const startTime = new Date(formData.start_time);
      const endTime = new Date(startTime.getTime() + formData.duration_minutes * 60000);
      
      // Prepare data for API
      const appointmentData = {
        ...formData,
        status: "booked",
        end_time: endTime.toISOString(),
      };
      
      const response = await createAppointment(appointmentData);
      
      // Navigate to the appointment detail page
      navigate(`/appointments/${response.id}`);
    } catch (err) {
      console.error("Error creating appointment:", err);
      setError("Failed to record appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Get min date (today) for date picker
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="appointment-form-container">
      <Card>
        <Card.Header>
          <h2>Record New Appointment</h2>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="title">
              <Form.Label>Appointment Title*</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="E.g., Annual Physical, Follow-up Visit"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3" controlId="participant_name">
              <Form.Label>Provider Name*</Form.Label>
              <Form.Control
                type="text"
                name="participant_name"
                value={formData.participant_name}
                onChange={handleChange}
                placeholder="E.g., Dr. John Smith"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3" controlId="start_time">
              <Form.Label>Date and Time*</Form.Label>
              <Form.Control
                type="datetime-local"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                min={getMinDate()}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3" controlId="duration_minutes">
              <Form.Label>Duration (minutes)*</Form.Label>
              <Form.Control
                type="number"
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleChange}
                min="5"
                max="480"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-4">
              <Form.Check
                type="checkbox"
                id="is_virtual"
                name="is_virtual"
                label="This is a virtual appointment"
                checked={formData.is_virtual}
                onChange={handleChange}
              />
            </Form.Group>
            
            <div className="d-flex justify-content-between">
              <Button 
                variant="outline-secondary" 
                onClick={() => navigate('/appointments')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                    <span className="ms-2">Saving...</span>
                  </>
                ) : (
                  'Record Appointment'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}

export default AppointmentForm; 