import React, { useRef } from "react";
import { Container } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import { ConnectionProvider } from "../../context/ConnectionContext";
import WelcomeCard from "./WelcomeCard";
import KpiTiles from "./KpiTiles";
import AppointmentsCard from "./AppointmentsCard";
import AlertsCard from "./AlertsCard";
import VitalsCard from "./VitalsCard";
import LabResultsCard from "./LabResultsCard";
import InsightsCard from "./InsightsCard";
import "./Dashboard.css";

function Dashboard() {
  const { user } = useAuth();
  
  // Create refs for scrolling to sections
  const appointmentsRef = useRef(null);
  const alertsRef = useRef(null);
  const screeningsRef = useRef(null); // This will be part of the AlertsCard
  const prioritiesRef = useRef(null);
  
  // Handle KPI tile click to scroll to respective section
  const handleTileClick = (tileId) => {
    let targetRef;
    
    switch (tileId) {
      case "appointments":
        targetRef = appointmentsRef;
        break;
      case "alerts":
        targetRef = alertsRef;
        break;
      case "screenings":
        targetRef = alertsRef; // Screenings is part of Alerts
        break;
      case "priorities":
        targetRef = prioritiesRef;
        break;
      default:
        return;
    }
    
    if (targetRef && targetRef.current) {
      // Get the element's position
      const elementPosition = targetRef.current.getBoundingClientRect().top;
      
      // Account for fixed header height (adjust 60px to match your header height)
      const headerOffset = 60;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      // Smoothly scroll to the target position
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <ConnectionProvider>
      <div className="dashboard-page">
        <Container className="main-container">
          {/* Welcome Card with Health Score and Quick Actions */}
          <WelcomeCard user={user} />
          
          {/* KPI Tiles */}
          <KpiTiles onTileClick={handleTileClick} />
          
          {/* Dashboard Grid */}
          <div className="dashboard-grid">
            {/* Upcoming Appointments Card - Full Width */}
            <div className="dashboard-grid-3x1" ref={appointmentsRef} id="appointments-section">
              <AppointmentsCard />
            </div>

            {/* Key Vitals Card */}
            <VitalsCard />
            {/* Key Lab Results Card */}
            <LabResultsCard />

            {/* Health Alerts Card - Full Width */}
            <div className="dashboard-grid-3x1" ref={alertsRef} id="alerts-section">
              <AlertsCard />
            </div>
            
            {/* Health Insights Card */}
            <div ref={prioritiesRef} id="priorities-section" className="dashboard-grid-3x1">
              <InsightsCard />
            </div>
          </div>
        </Container>
      </div>
    </ConnectionProvider>
  );
}

export default Dashboard; 