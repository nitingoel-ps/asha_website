import React, { useState, useEffect } from "react";
import { Form, Button, Card, Alert, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { createAppointment } from "../../utils/appointmentsService";
import "./AppointmentForm.css";

function AppointmentForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [formData, setFormData] = useState({
    title: "",
    participant_name: "",
    start_time: "",
    duration_minutes: 30,
    is_virtual: false
  });

  // Set up mobile title
  useEffect(() => {
    // Set mobile page title
    if (window.setMobilePageTitle) {
      window.setMobilePageTitle("Add Appointment");
    }

    // Check for mobile screen size
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      // Clean up when component unmounts
      if (window.setMobilePageTitle) {
        window.setMobilePageTitle(null);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
      
      // Get the local datetime string from the input
      const localDateTime = formData.start_time;
      
      // Parse the local datetime string into its components
      const [datePart, timePart] = localDateTime.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      
      // Create a Date object in local time
      const startTime = new Date(year, month - 1, day, hours, minutes);
      
      // Get the timezone offset in minutes and convert to hours
      const timezoneOffset = -startTime.getTimezoneOffset() / 60;
      const timezoneSign = timezoneOffset >= 0 ? '+' : '-';
      const timezoneHours = Math.abs(timezoneOffset).toString().padStart(2, '0');
      
      // Format the datetime with timezone offset (ISO 8601)
      // Use the local time components directly instead of converting to UTC
      const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
      const startTimeWithTimezone = `${formattedDate}T${formattedTime}${timezoneSign}${timezoneHours}:00`;
      
      // Calculate end time with the same timezone
      const endTime = new Date(startTime.getTime() + formData.duration_minutes * 60000);
      const endHours = endTime.getHours();
      const endMinutes = endTime.getMinutes();
      const endTimeWithTimezone = `${formattedDate}T${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00${timezoneSign}${timezoneHours}:00`;
      
      // Prepare data for API
      const appointmentData = {
        ...formData,
        status: "booked",
        start_time: startTimeWithTimezone,
        end_time: endTimeWithTimezone,
        timezone_offset: timezoneOffset // Include the timezone offset for reference
      };
      
      const response = await createAppointment(appointmentData);
      
      // Navigate to the appointment detail page
      if (response.appointment && response.appointment.id) {
        navigate(`/appointments/${response.appointment.id}`);
      } else {
        throw new Error("Invalid response format from server");
      }
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
          {!isMobile && <h2>Record New Appointment</h2>}
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