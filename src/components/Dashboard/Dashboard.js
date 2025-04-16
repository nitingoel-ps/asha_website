import React from "react";
import { Container } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import { ConnectionProvider } from "../../context/ConnectionContext";
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
    <ConnectionProvider>
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

            {/* Key Vitals Card */}
            <VitalsCard />
            {/* Key Lab Results Card */}
            <LabResultsCard />

            {/* Health Alerts Card - Full Width */}
            <div className="dashboard-grid-3x1">
              <AlertsCard />
            </div>
            
            {/* Health Insights Card */}
            <InsightsCard />
          </div>
        </Container>
      </div>
    </ConnectionProvider>
  );
}

export default Dashboard; 