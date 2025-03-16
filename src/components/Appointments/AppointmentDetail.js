import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Spinner, Badge, Alert } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { fetchAppointmentById, updateAppointmentStatus } from "../../utils/appointmentsService";
import "./AppointmentDetail.css";

function AppointmentDetail() {
  const { appointmentId } = useParams();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getAppointmentDetails = async () => {
      try {
        setLoading(true);
        const data = await fetchAppointmentById(appointmentId);
        setAppointment(data);
      } catch (err) {
        console.error("Error fetching appointment details:", err);
        setError("Failed to load appointment details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    getAppointmentDetails();
  }, [appointmentId]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      setStatusUpdateLoading(true);
      const updatedAppointment = await updateAppointmentStatus(appointmentId, newStatus);
      setAppointment(updatedAppointment);
      setStatusUpdateSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setStatusUpdateSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Error updating appointment status:", err);
      setError("Failed to update appointment status. Please try again later.");
    } finally {
      setStatusUpdateLoading(false);
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
        <>
          {statusUpdateSuccess && (
            <Alert variant="success" className="mb-4">
              Appointment status updated successfully.
            </Alert>
          )}

          <Card className="appointment-card mb-4">
            <Card.Body>
              <Row>
                <Col md={8}>
                  <h2 className="appointment-title">
                    {appointment.title || appointment.appointment_type || "Appointment"}
                  </h2>
                  <div className="appointment-meta">
                    <div className="appointment-provider">
                      <span className="label">Provider:</span> 
                      {appointment.participant_name || appointment.provider?.name || "Not specified"}
                    </div>
                    <div className="appointment-datetime">
                      <span className="label">Date & Time:</span> 
                      {formatDate(appointment.start_time)} at {formatTime(appointment.start_time)}
                    </div>
                    {appointment.duration_minutes && (
                      <div className="appointment-duration">
                        <span className="label">Duration:</span> 
                        {appointment.duration_minutes} minutes
                      </div>
                    )}
                    {appointment.end_time && !appointment.duration_minutes && (
                      <div className="appointment-duration">
                        <span className="label">Duration:</span> 
                        {calculateDuration(appointment.start_time, appointment.end_time)}
                      </div>
                    )}
                  </div>
                </Col>
                <Col md={4} className="text-md-end">
                  <Badge bg={getStatusBadgeVariant(appointment.status)} className="status-badge">
                    {formatStatus(appointment.status)}
                  </Badge>
                  
                  {canBeCancelled(appointment) && (
                    <div className="mt-3">
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        disabled={statusUpdateLoading}
                        onClick={() => handleStatusUpdate('cancelled')}
                      >
                        {statusUpdateLoading ? (
                          <>
                            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                            <span className="ms-2">Cancelling...</span>
                          </>
                        ) : (
                          'Cancel Appointment'
                        )}
                      </Button>
                    </div>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Row>
            <Col md={6}>
              <Card className="mb-4 mb-md-0">
                <Card.Header>Location Information</Card.Header>
                <Card.Body>
                  {appointment.is_virtual ? (
                    <div className="virtual-appointment">
                      <div className="virtual-badge mb-3">
                        <i className="bi bi-camera-video"></i> Virtual Appointment
                      </div>
                      
                      {appointment.virtual_meeting_url ? (
                        <div className="meeting-link">
                          <div className="mb-2">Meeting Link:</div>
                          <a href={appointment.virtual_meeting_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                            Join Meeting
                          </a>
                        </div>
                      ) : (
                        <p>Meeting link will be provided closer to the appointment time.</p>
                      )}
                    </div>
                  ) : appointment.location_name ? (
                    <div className="physical-location">
                      <div className="location-name mb-2">{appointment.location_name}</div>
                      {appointment.location_address && (
                        <div className="location-address mb-2">{appointment.location_address}</div>
                      )}
                      {appointment.location_phone && (
                        <div className="location-phone">
                          <span className="label">Phone:</span> {appointment.location_phone}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted">No location information available.</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card>
                <Card.Header>Additional Information</Card.Header>
                <Card.Body>
                  {appointment.description && (
                    <div className="appointment-description mb-3">
                      <div className="label mb-1">Description:</div>
                      <p>{appointment.description}</p>
                    </div>
                  )}
                  
                  {appointment.reason && (
                    <div className="appointment-reason mb-3">
                      <div className="label mb-1">Reason:</div>
                      <p>{appointment.reason}</p>
                    </div>
                  )}
                  
                  {appointment.comments && (
                    <div className="appointment-comments mb-3">
                      <div className="label mb-1">Comments:</div>
                      <p>{appointment.comments}</p>
                    </div>
                  )}
                  
                  {appointment.specialty && (
                    <div className="appointment-specialty mb-3">
                      <div className="label mb-1">Specialty:</div>
                      <p>{appointment.specialty}</p>
                    </div>
                  )}
                  
                  {!appointment.description && !appointment.reason && !appointment.comments && !appointment.specialty && (
                    <p className="text-muted">No additional information available.</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        <Alert variant="warning">Appointment not found.</Alert>
      )}
    </Container>
  );
}

export default AppointmentDetail; 