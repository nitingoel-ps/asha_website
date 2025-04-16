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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  // Set up mobile title and edit action button
  useEffect(() => {
    // Set mobile page title
    if (window.setMobilePageTitle) {
      window.setMobilePageTitle("Appointment Details");
    }

    // Set mobile action button (edit button)
    if (window.setMobileActionButton && !isEditing) {
      window.setMobileActionButton({
        icon: 'edit',
        action: () => setIsEditing(true)
      });
    } else if (window.setMobileActionButton && isEditing) {
      // Remove action button while in editing mode
      window.setMobileActionButton(null);
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
      if (window.setMobileActionButton) {
        window.setMobileActionButton(null);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isEditing]);

  useEffect(() => {
    const getAppointmentDetails = async () => {
      try {
        setLoading(true);
        const data = await fetchAppointmentById(appointmentId);
        setAppointment(data);
        
        // Format the start_time for datetime-local input
        const formattedData = {
          ...data,
          start_time: data.start_time ? new Date(data.start_time).toISOString().slice(0, 16) : ""
        };
        setEditData(formattedData);
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
      
      // Create a copy of edit data to send to the API
      const dataToSubmit = { ...editData };
      
      // If start_time was changed, ensure it's in ISO format for the API
      if (dataToSubmit.start_time) {
        // The datetime-local input gives us a local datetime string
        // Make sure it's converted to a proper ISO string for the API
        const dateObj = new Date(dataToSubmit.start_time);
        dataToSubmit.start_time = dateObj.toISOString();
      }
      
      const response = await updateAppointment(appointmentId, dataToSubmit);
      if (response.appointment) {
        setAppointment(response.appointment);
        
        // Format the start_time for datetime-local input for editData
        const formattedData = {
          ...response.appointment,
          start_time: response.appointment.start_time ? 
            new Date(response.appointment.start_time).toISOString().slice(0, 16) : ""
        };
        setEditData(formattedData);
        
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
    // Format the start_time for datetime-local input
    const formattedData = {
      ...appointment,
      start_time: appointment.start_time ? 
        new Date(appointment.start_time).toISOString().slice(0, 16) : ""
    };
    setEditData(formattedData);
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
        <div className="field-group">
          <div className="field-label">{label}{isEditing && required && "*"}</div>
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
                checked={editData[fieldName] || false}
                onChange={handleInputChange}
                className="w-100"
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
            <p className="field-value">{value}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Container className={`appointment-detail-page ${isEditing && isMobile ? 'editing' : ''}`}>
      {/* Only show header with buttons on desktop or when editing on mobile */}
      {(!isMobile || isEditing) && (
        <div className="d-flex align-items-center mb-4">
          {/* Only show the back button on non-mobile screens */}
          {!isMobile && (
            <Button 
              variant="link" 
              className="p-0 me-3 back-button" 
              onClick={() => navigate('/appointments')}
            >
              ← Back to Appointments
            </Button>
          )}
          
          {/* Only show the h1 title on non-mobile screens */}
          {!isMobile && <h1>Appointment Details</h1>}
          
          {!isEditing ? (
            !isMobile && (
              <Button 
                variant="outline-primary"
                className="ms-auto"
                onClick={() => setIsEditing(true)}
              >
                Edit Appointment
              </Button>
            )
          ) : (
            <div className={`${isMobile ? 'edit-buttons-mobile' : 'ms-auto'}`}>
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
      )}
      
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
                  {renderField('Title', appointment.title, 'title', 'text', true)}

                  {renderField('Provider Name', appointment.participant_name, 'participant_name', 'text', true)}

                  <div className="field-group">
                    <div className="field-label">Date & Time{isEditing && "*"}</div>
                    {isEditing ? (
                      <Form.Control
                        type="datetime-local"
                        name="start_time"
                        value={editData.start_time ? new Date(editData.start_time).toISOString().slice(0, 16) : ""}
                        onChange={handleInputChange}
                        required
                      />
                    ) : (
                      <p className="field-value">{formatDate(appointment.start_time)} at {formatTime(appointment.start_time)}</p>
                    )}
                  </div>

                  {appointment.duration_minutes && (
                    renderField('Duration', `${appointment.duration_minutes} minutes`, 'duration_minutes')
                  )}

                  {renderField('Reason for Visit', appointment.reason || "Not specified", 'reason')}

                  <div className="field-group">
                    <div className="field-label">Virtual Appointment</div>
                    {isEditing ? (
                      <div className="checkbox-wrapper">
                        <Form.Check
                          type="checkbox"
                          id="is_virtual"
                          name="is_virtual"
                          label="This is a virtual appointment"
                          checked={editData.is_virtual || false}
                          onChange={handleInputChange}
                        />
                      </div>
                    ) : (
                      <p className="field-value">{appointment.is_virtual ? "Yes" : "No"}</p>
                    )}
                  </div>
                </Card.Body>
              </Card>

              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">Discussion Topics</h5>
                </Card.Header>
                <Card.Body>
                  <div className="field-group">
                    <div className="field-label">Topics to Discuss</div>
                    {isEditing ? (
                      <Form.Control
                        as="textarea"
                        rows={4}
                        name="comments"
                        value={editData.comments || ""}
                        onChange={handleInputChange}
                        placeholder="List any topics, questions, or concerns you want to discuss during the appointment..."
                      />
                    ) : appointment.comments ? (
                      <div className="topics-list field-value">
                        {appointment.comments.split('\n').map((topic, index) => (
                          <div key={index} className="topic-item">
                            {topic}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="field-value text-muted">No discussion topics added yet. Click 'Edit Appointment' to add topics to discuss.</p>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              {(appointment.location_name || appointment.location) && (
                <Card className="mb-4">
                  <Card.Header>Location Information</Card.Header>
                  <Card.Body>
                    {appointment.location_name && (
                      <div className="field-group">
                        <div className="field-label">Location Name</div>
                        <p className="field-value">{appointment.location_name}</p>
                      </div>
                    )}
                    {appointment.location && (
                      <div className="field-group">
                        <div className="field-label">Address</div>
                        <p className="field-value">{appointment.location}</p>
                      </div>
                    )}
                    {appointment.location_phone && (
                      <div className="field-group">
                        <div className="field-label">Location Phone</div>
                        <p className="field-value">{appointment.location_phone}</p>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}

              {appointment.is_virtual && (
                <Card className="mb-4">
                  <Card.Header>Virtual Meeting Information</Card.Header>
                  <Card.Body>
                    <div className="virtual-badge mb-3">
                      <i className="bi bi-camera-video"></i> Virtual Appointment
                    </div>
                    {appointment.virtual_meeting_url && (
                      <div className="field-group">
                        <div className="field-label">Meeting URL</div>
                        <p className="field-value">
                          <a href={appointment.virtual_meeting_url} target="_blank" rel="noopener noreferrer">
                            {appointment.virtual_meeting_url}
                          </a>
                        </p>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}

              {appointment.notes && (
                <Card className="mb-4">
                  <Card.Header>Notes</Card.Header>
                  <Card.Body>
                    <div className="field-group">
                      <div className="field-label">Additional Notes</div>
                      <p className="field-value">{appointment.notes}</p>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </Col>
          </Row>
          
          {/* Add spacer to prevent content from hiding under bottom navbar */}
          <div className="bottom-spacer"></div>
        </Form>
      ) : (
        <Alert variant="warning">Appointment not found.</Alert>
      )}
    </Container>
  );
}

export default AppointmentDetail; 