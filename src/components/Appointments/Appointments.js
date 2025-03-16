import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppointmentsPage from "./AppointmentsPage";
import AppointmentDetail from "./AppointmentDetail";
import AppointmentForm from "./AppointmentForm";

function Appointments() {
  return (
    <Routes>
      <Route path="/" element={<AppointmentsPage />} />
      <Route path="/new" element={<AppointmentForm />} />
      <Route path="/:appointmentId" element={<AppointmentDetail />} />
      <Route path="*" element={<Navigate to="/appointments" replace />} />
    </Routes>
  );
}

export default Appointments; 