import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Spinner, Alert, ButtonGroup } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { fetchAppointments } from "../../utils/appointmentsService";
import "./AppointmentsPage.css";
import "../shared/TabStyling.css"; // Import shared tab styling

function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('upcoming');

  // Set up mobile title and action button
  useEffect(() => {
    // Set mobile page title
    if (window.setMobilePageTitle) {
      window.setMobilePageTitle("My Appointments");
    }

    // Set mobile action button (+ button)
    if (window.setMobileActionButton) {
      window.setMobileActionButton({
        icon: 'plus',
        action: () => navigate('/appointments/new')
      });
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
  }, [navigate]);

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

  // Render appointments list based on which are currently being displayed
  const renderAppointmentsList = () => {
    const currentAppointments = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;
    
    if (currentAppointments.length === 0) {
      return (
        <div className="no-appointments text-center p-5">
          {activeTab === 'upcoming' ? (
            <>
              <p className="mb-4">You don't have any upcoming appointments.</p>
              <Button 
                variant="primary" 
                onClick={() => navigate('/appointments/new')}
              >
                Record Your First Appointment
              </Button>
            </>
          ) : (
            <p>You don't have any past appointments.</p>
          )}
        </div>
      );
    }
    
    return (
      <div className="appointments-list">
        {currentAppointments.map(appointment => {
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
              </Row>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Container className="appointments-page py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        {/* Only show the h1 title on non-mobile screens */}
        {!isMobile && <h1>My Appointments</h1>}
        
        {/* Only show the button on non-mobile screens */}
        {!isMobile && (
          <Button 
            variant="primary" 
            onClick={() => navigate('/appointments/new')}
          >
            Record New Appointment
          </Button>
        )}
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
        <>
          <div className="app-button-tabs appointments-tabs">
            <ButtonGroup className="w-100">
              <Button 
                variant={activeTab === 'upcoming' ? 'primary' : 'outline-primary'}
                onClick={() => setActiveTab('upcoming')}
                className="flex-grow-1"
              >
                Upcoming ({upcomingAppointments.length})
              </Button>
              <Button 
                variant={activeTab === 'past' ? 'primary' : 'outline-primary'}
                onClick={() => setActiveTab('past')}
                className="flex-grow-1"
              >
                Past ({pastAppointments.length})
              </Button>
            </ButtonGroup>
          </div>

          <div className="tab-content">
            {renderAppointmentsList()}
          </div>
        </>
      )}
    </Container>
  );
}

export default AppointmentsPage; 