import React from "react";
import { Container } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import WelcomeCard from "./WelcomeCard";
import AppointmentsCard from "./AppointmentsCard";
import AlertsCard from "./AlertsCard";
import VitalsCard from "./VitalsCard";
import LabResultsCard from "./LabResultsCard";
import InsightsCard from "./InsightsCard";
import "./Dashboard.css";

function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-page">
      <Container className="main-container">
        {/* Welcome Card with Health Score and Quick Actions */}
        <WelcomeCard user={user} />
        
        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Upcoming Appointments Card - Full Width */}
          <div className="dashboard-grid-3x1">
            <AppointmentsCard />
          </div>
          
          {/* Health Alerts Card - Full Width */}
          <div className="dashboard-grid-3x1">
            <AlertsCard />
          </div>
          
          {/* Key Vitals Card */}
          <VitalsCard />
          
          {/* Key Lab Results Card */}
          <LabResultsCard />
          
          {/* Health Insights Card */}
          <InsightsCard />
        </div>
      </Container>
    </div>
  );
}

export default Dashboard; 