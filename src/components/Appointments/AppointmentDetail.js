import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Spinner, Badge, Alert, Form, Modal } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { fetchAppointmentById, updateAppointment, updateAppointmentStatus, deleteAppointment } from "../../utils/appointmentsService";
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
          start_time: data.start_time ? formatDateTimeForInput(data.start_time) : ""
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

  // Helper function to format datetime for input while preserving local time
  const formatDateTimeForInput = (dateString) => {
    // Create a Date object from the UTC time
    const date = new Date(dateString);
    
    // Get the local time components
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    // Return in the format required by datetime-local input
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      // Create a copy of edit data to send to the API
      const dataToSubmit = { ...editData };
      
      // If start_time was changed, ensure it's in ISO format for the API
      if (dataToSubmit.start_time) {
        // Parse the local datetime string into its components
        const [datePart, timePart] = dataToSubmit.start_time.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        // Create a Date object in local time
        const startTime = new Date(year, month - 1, day, hours, minutes);
        
        // Get the timezone offset in minutes and convert to hours
        const timezoneOffset = -startTime.getTimezoneOffset() / 60;
        const timezoneSign = timezoneOffset >= 0 ? '+' : '-';
        const timezoneHours = Math.abs(timezoneOffset).toString().padStart(2, '0');
        
        // Format the datetime with timezone offset (ISO 8601)
        const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
        dataToSubmit.start_time = `${formattedDate}T${formattedTime}${timezoneSign}${timezoneHours}:00`;
      }
      
      const response = await updateAppointment(appointmentId, dataToSubmit);
      if (response.appointment) {
        setAppointment(response.appointment);
        
        // Format the start_time for datetime-local input for editData
        const formattedData = {
          ...response.appointment,
          start_time: response.appointment.start_time ? 
            formatDateTimeForInput(response.appointment.start_time) : ""
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
        formatDateTimeForInput(appointment.start_time) : ""
    };
    setEditData(formattedData);
    setIsEditing(false);
    setError(null);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteAppointment(appointmentId);
      setShowDeleteModal(false);
      navigate('/appointments');
    } catch (err) {
      console.error("Error deleting appointment:", err);
      setError("Failed to delete appointment. Please try again.");
    } finally {
      setDeleting(false);
    }
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
              <div className="ms-auto d-flex gap-2">
                <Button 
                  variant="outline-primary"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Appointment
                </Button>
                <Button 
                  variant="outline-danger"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete Appointment
                </Button>
              </div>
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
                        value={editData.start_time || ""}
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

              {/* Add delete button for mobile after Discussion Topics card */}
              {isMobile && !isEditing && (
                <div className="mb-4">
                  <Button 
                    variant="outline-danger" 
                    className="w-100"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Delete Appointment
                  </Button>
                </div>
              )}
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

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Appointment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this appointment? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span className="ms-2">Deleting...</span>
              </>
            ) : (
              'Delete Appointment'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default AppointmentDetail; 