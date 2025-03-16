import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Spinner, Tabs, Tab, Badge } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { fetchAppointments } from "../../utils/appointmentsService";
import "./AppointmentsPage.css";

function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getAppointments = async () => {
      try {
        setLoading(true);
        const data = await fetchAppointments();
        
        // Ensure data is an array
        const appointmentsArray = Array.isArray(data) ? data : [];
        setAppointments(appointmentsArray);
        setError(null);
      } catch (err) {
        console.error("Error fetching appointments:", err);
        setError("Failed to load appointments. Please try again later.");
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    getAppointments();
  }, []);

  // Group appointments into upcoming and past
  const upcomingAppointments = appointments
    .filter(appointment => {
      const appointmentDate = new Date(appointment.start_time);
      const today = new Date();
      return appointmentDate >= today;
    })
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const pastAppointments = appointments
    .filter(appointment => {
      const appointmentDate = new Date(appointment.start_time);
      const today = new Date();
      return appointmentDate < today;
    })
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time)); // Most recent first

  // Format date for the date box
  const formatDateBox = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
    return { day, month };
  };

  // Format full date and time for the details
  const formatFullDateTime = (dateString) => {
    const date = new Date(dateString);
    const fullDate = date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const time = date.toLocaleString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return { fullDate, time };
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

  return (
    <Container className="appointments-page py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>My Appointments</h1>
        <Button 
          variant="primary" 
          onClick={() => navigate('/appointments/new')}
        >
          Record New Appointment
        </Button>
      </div>

      {loading ? (
        <div className="text-center p-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : (
        <Tabs defaultActiveKey="upcoming" id="appointments-tabs" className="mb-4">
          <Tab eventKey="upcoming" title={`Upcoming (${upcomingAppointments.length})`}>
            {upcomingAppointments.length > 0 ? (
              <div className="appointments-list">
                {upcomingAppointments.map(appointment => {
                  const boxDate = formatDateBox(appointment.start_time);
                  const { fullDate, time } = formatFullDateTime(appointment.start_time);
                  return (
                    <div key={appointment.id} className="appointment-item" onClick={() => navigate(`/appointments/${appointment.id}`)}>
                      <Row className="align-items-center">
                        <Col lg={2} md={3}>
                          <div className="appointment-date">
                            <div className="date">{boxDate.day}</div>
                            <div className="month">{boxDate.month}</div>
                          </div>
                        </Col>
                        <Col lg={8} md={7}>
                          <div className="appointment-details">
                            <h4>{appointment.title || appointment.appointment_type}</h4>
                            <div className="provider">
                              {appointment.participant_name || appointment.provider?.name || "Provider not specified"}
                            </div>
                            <div className="datetime text-muted">
                              {fullDate} at {time}
                            </div>
                            {appointment.location_name && (
                              <div className="location">
                                <i className="bi bi-geo-alt"></i> {appointment.location_name}
                              </div>
                            )}
                            {appointment.is_virtual && (
                              <div className="virtual-badge">
                                <i className="bi bi-camera-video"></i> Virtual Appointment
                              </div>
                            )}
                          </div>
                        </Col>
                        <Col lg={2} md={2} className="text-end">
                          <Badge bg={getStatusBadgeVariant(appointment.status)} className="status-badge">
                            {formatStatus(appointment.status)}
                          </Badge>
                        </Col>
                      </Row>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-appointments text-center p-5">
                <p className="mb-4">You don't have any upcoming appointments.</p>
                <Button 
                  variant="primary" 
                  onClick={() => navigate('/appointments/new')}
                >
                  Record Your First Appointment
                </Button>
              </div>
            )}
          </Tab>
          <Tab eventKey="past" title={`Past (${pastAppointments.length})`}>
            {pastAppointments.length > 0 ? (
              <div className="appointments-list">
                {pastAppointments.map(appointment => {
                  const boxDate = formatDateBox(appointment.start_time);
                  const { fullDate, time } = formatFullDateTime(appointment.start_time);
                  return (
                    <div key={appointment.id} className="appointment-item" onClick={() => navigate(`/appointments/${appointment.id}`)}>
                      <Row className="align-items-center">
                        <Col lg={2} md={3}>
                          <div className="appointment-date">
                            <div className="date">{boxDate.day}</div>
                            <div className="month">{boxDate.month}</div>
                          </div>
                        </Col>
                        <Col lg={8} md={7}>
                          <div className="appointment-details">
                            <h4>{appointment.title || appointment.appointment_type}</h4>
                            <div className="provider">
                              {appointment.participant_name || appointment.provider?.name || "Provider not specified"}
                            </div>
                            <div className="datetime text-muted">
                              {fullDate} at {time}
                            </div>
                            {appointment.location_name && (
                              <div className="location">
                                <i className="bi bi-geo-alt"></i> {appointment.location_name}
                              </div>
                            )}
                            {appointment.is_virtual && (
                              <div className="virtual-badge">
                                <i className="bi bi-camera-video"></i> Virtual Appointment
                              </div>
                            )}
                          </div>
                        </Col>
                        <Col lg={2} md={2} className="text-end">
                          <Badge bg={getStatusBadgeVariant(appointment.status)} className="status-badge">
                            {formatStatus(appointment.status)}
                          </Badge>
                        </Col>
                      </Row>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-appointments text-center p-5">
                <p>You don't have any past appointments.</p>
              </div>
            )}
          </Tab>
        </Tabs>
      )}
    </Container>
  );
}

export default AppointmentsPage; 