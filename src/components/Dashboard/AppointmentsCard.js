import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchAppointments } from "../../utils/appointmentsService";
import { Button, Spinner } from "react-bootstrap";
import "./AppointmentsCard.css";

function AppointmentsCard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getAppointments = async () => {
      try {
        setLoading(true);
        const data = await fetchAppointments();
        
        // Ensure data is an array
        const appointmentsArray = Array.isArray(data) ? data : [];
        
        // Filter to only show upcoming appointments with status "booked", "pending", or "proposed"
        const upcomingAppointments = appointmentsArray
          .filter(appointment => {
            const appointmentDate = new Date(appointment.start_time);
            const today = new Date();
            return (
              appointmentDate >= today && 
              ["booked", "pending", "proposed"].includes(appointment.status)
            );
          })
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        
        setAppointments(upcomingAppointments);
        setError(null); // Clear any previous errors
      } catch (err) {
        console.error("Error fetching appointments:", err);
        // Don't show error message, just set empty appointments
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    getAppointments();
  }, []);

  // Format date from ISO string to day and month
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    return { day, month };
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

  return (
    <div className="card">
      <div className="card-header card-header-single-line">
        <div className="card-title">
          <span>📅</span> Appointments
        </div>
        <Link to="/appointments" className="card-action">View All</Link>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-center p-4">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : (
          <div className="upcoming-list">
            {appointments.length > 0 ? (
              appointments.map(appointment => {
                const formattedDate = formatDate(appointment.start_time);
                return (
                  <div key={appointment.id} className="appointment-card">
                    <div className="appointment-date">
                      <div className="appointment-day">{formattedDate.day}</div>
                      <div className="appointment-month">{formattedDate.month}</div>
                    </div>
                    <div className="appointment-details">
                      <div className="appointment-type">{appointment.title || appointment.appointment_type}</div>
                      <div className="appointment-info">
                        <div className="appointment-doctor">👨‍⚕️ {appointment.participant_name || appointment.provider?.name || "Not specified"}</div>
                        <div className="appointment-time">🕒 {formatTime(appointment.start_time)}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-appointments">
                <p>No upcoming appointments scheduled.</p>
                <Link to="/appointments/new">
                  <Button variant="primary" size="sm">
                    Record an Appointment
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AppointmentsCard; 