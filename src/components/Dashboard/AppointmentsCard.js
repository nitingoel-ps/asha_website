import React from "react";
import { Link } from "react-router-dom";
import "./AppointmentsCard.css";

function AppointmentsCard() {
  // Mock data for appointments
  const appointments = [
    {
      id: 1,
      type: "Annual Physical",
      doctor: "Dr. Sarah Johnson",
      date: { day: 25, month: "Mar" },
      time: "10:30 AM"
    },
    {
      id: 2,
      type: "Cardiology Follow-up",
      doctor: "Dr. Michael Chen",
      date: { day: 12, month: "Apr" },
      time: "2:15 PM"
    }
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <span>📅</span> Upcoming Appointments
        </div>
        <Link to="/appointments" className="card-action">View All</Link>
      </div>
      <div className="card-body">
        <div className="upcoming-list">
          {appointments.map(appointment => (
            <div key={appointment.id} className="appointment-card">
              <div className="appointment-date">
                <div className="appointment-day">{appointment.date.day}</div>
                <div className="appointment-month">{appointment.date.month}</div>
              </div>
              <div className="appointment-details">
                <div className="appointment-type">{appointment.type}</div>
                <div className="appointment-info">
                  <div className="appointment-doctor">👨‍⚕️ {appointment.doctor}</div>
                  <div className="appointment-time">🕒 {appointment.time}</div>
                </div>
              </div>
            </div>
          ))}
          {appointments.length === 0 && (
            <div className="no-appointments">
              No upcoming appointments scheduled.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AppointmentsCard; 