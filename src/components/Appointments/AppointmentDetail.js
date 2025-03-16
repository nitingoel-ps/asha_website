import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Spinner, Badge, Alert, Form } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { fetchAppointmentById, updateAppointment, updateAppointmentStatus } from "../../utils/appointmentsService";
import "./AppointmentDetail.css";

function AppointmentDetail() {
  const { appointmentId } = useParams();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const getAppointmentDetails = async () => {
      try {
        setLoading(true);
        const data = await fetchAppointmentById(appointmentId);
        setAppointment(data);
        setEditData(data);
      } catch (err) {
        console.error("Error fetching appointment details:", err);
        setError("Failed to load appointment details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    getAppointmentDetails();
  }, [appointmentId]);

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await updateAppointment(appointmentId, editData);
      if (response.appointment) {
        setAppointment(response.appointment);
        setEditData(response.appointment);
        setIsEditing(false);
        setSuccessMessage("Appointment updated successfully!");
        
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error updating appointment:", err);
      setError("Failed to update appointment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleCancel = () => {
    setEditData(appointment);
    setIsEditing(false);
    setError(null);
  };

  // Format date from ISO string to readable format
  const formatDate = (dateString) => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Format time from ISO string to AM/PM format
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  // Get status badge color
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'booked':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'danger';
      case 'fulfilled':
        return 'info';
      case 'noshow':
        return 'dark';
      default:
        return 'secondary';
    }
  };

  // Format status for display
  const formatStatus = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' ');
  };

  // Calculate duration in minutes or hours
  const calculateDuration = (startTime, endTime) => {
    if (!endTime) return null;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    if (durationMinutes < 60) {
      return `${durationMinutes} minutes`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return minutes > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes` : `${hours} hour${hours > 1 ? 's' : ''}`;
    }
  };

  // Check if appointment is in the future
  const isUpcoming = (startTime) => {
    const appointmentDate = new Date(startTime);
    const today = new Date();
    return appointmentDate > today;
  };

  // Check if appointment can be cancelled (only upcoming and not already cancelled)
  const canBeCancelled = (appointment) => {
    return isUpcoming(appointment.start_time) && 
           appointment.status !== 'cancelled' && 
           appointment.status !== 'fulfilled' && 
           appointment.status !== 'noshow';
  };

  const renderField = (label, value, fieldName, type = "text", required = false) => {
    if (isEditing || value) {
      return (
        <Form.Group className="mb-3">
          <Form.Label>{label}{required && "*"}</Form.Label>
          {isEditing ? (
            type === "textarea" ? (
              <Form.Control
                as="textarea"
                rows={4}
                name={fieldName}
                value={editData[fieldName] || ""}
                onChange={handleInputChange}
                required={required}
              />
            ) : type === "checkbox" ? (
              <Form.Check
                type="checkbox"
                name={fieldName}
                label={label}
                checked={editData[fieldName] || false}
                onChange={handleInputChange}
              />
            ) : (
              <Form.Control
                type={type}
                name={fieldName}
                value={editData[fieldName] || ""}
                onChange={handleInputChange}
                required={required}
              />
            )
          ) : (
            <p className="mb-0">{value}</p>
          )}
        </Form.Group>
      );
    }
    return null;
  };

  return (
    <Container className="appointment-detail-page py-4">
      <div className="d-flex align-items-center mb-4">
        <Button 
          variant="link" 
          className="p-0 me-3 back-button" 
          onClick={() => navigate('/appointments')}
        >
          ← Back to Appointments
        </Button>
        <h1>Appointment Details</h1>
        {!isEditing ? (
          <Button 
            variant="outline-primary"
            className="ms-auto"
            onClick={() => setIsEditing(true)}
          >
            Edit Appointment
          </Button>
        ) : (
          <div className="ms-auto">
            <Button 
              variant="outline-secondary"
              className="me-2"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button 
              variant="primary"
              onClick={handleEdit}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                  <span className="ms-2">Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center p-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : appointment ? (
        <Form onSubmit={handleEdit}>
          {successMessage && (
            <Alert variant="success" className="mb-4">
              {successMessage}
            </Alert>
          )}

          <Row>
            <Col md={8}>
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">Basic Information</h5>
                </Card.Header>
                <Card.Body>
                  {renderField("Title", appointment.title, "title", "text", true)}
                  {renderField("Provider Name", appointment.participant_name, "participant_name", "text", true)}
                  <div className="appointment-datetime">
                    <span className="label">Date & Time:</span> 
                    {formatDate(appointment.start_time)} at {formatTime(appointment.start_time)}
                  </div>
                  {appointment.duration_minutes && (
                    <div className="appointment-duration mt-2">
                      <span className="label">Duration:</span> 
                      {appointment.duration_minutes} minutes
                    </div>
                  )}
                  {renderField("Reason for Visit", appointment.reason, "reason")}
                  {renderField("Virtual Appointment", appointment.is_virtual, "is_virtual", "checkbox")}
                </Card.Body>
              </Card>

              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">Discussion Topics</h5>
                </Card.Header>
                <Card.Body>
                  {isEditing ? (
                    <Form.Group>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        name="comments"
                        value={editData.comments || ""}
                        onChange={handleInputChange}
                        placeholder="List any topics, questions, or concerns you want to discuss during the appointment..."
                      />
                    </Form.Group>
                  ) : appointment.comments ? (
                    <div className="topics-list">
                      {appointment.comments.split('\n').map((topic, index) => (
                        <div key={index} className="topic-item">
                          {topic}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No discussion topics added yet. Click 'Edit Appointment' to add topics to discuss.</p>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">Status</h5>
                </Card.Header>
                <Card.Body>
                  <Badge bg={getStatusBadgeVariant(appointment.status)} className="status-badge">
                    {formatStatus(appointment.status)}
                  </Badge>
                </Card.Body>
              </Card>

              <Card>
                <Card.Header>
                  <h5 className="mb-0">Location Information</h5>
                </Card.Header>
                <Card.Body>
                  {editData?.is_virtual ? (
                    <>
                      <div className="virtual-badge mb-3">
                        <i className="bi bi-camera-video"></i> Virtual Appointment
                      </div>
                      {renderField("Meeting URL", appointment.virtual_meeting_url, "virtual_meeting_url", "url")}
                    </>
                  ) : (
                    <>
                      {renderField("Location Name", appointment.location_name, "location_name")}
                      {renderField("Location Phone", appointment.location_phone, "location_phone", "tel")}
                      {renderField("Address", appointment.location_address, "location_address", "textarea")}
                    </>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Form>
      ) : (
        <Alert variant="warning">Appointment not found.</Alert>
      )}
    </Container>
  );
}

export default AppointmentDetail; 