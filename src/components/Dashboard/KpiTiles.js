import React, { useState, useEffect } from "react";
import axiosInstance from "../../utils/axiosInstance";

function KpiTiles({ onTileClick }) {
  const [kpiData, setKpiData] = useState({
    appointments: 0,
    alerts: 0,
    screenings: 0,
    priorities: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch data for KPIs
  useEffect(() => {
    const fetchKpiData = async () => {
      try {
        setLoading(true);
        
        // Fetch appointments
        try {
          const appointmentsResponse = await axiosInstance.get('/appointments/');
          // Check if we have the appointments array directly or nested in a property
          const appointmentsArray = appointmentsResponse.data?.appointments || 
                                    (Array.isArray(appointmentsResponse.data) ? appointmentsResponse.data : []);
          
          const upcomingAppointments = appointmentsArray.filter(appointment => {
            const appointmentDate = new Date(appointment.start_time);
            const today = new Date();
            return (
              appointmentDate >= today && 
              ["booked", "pending", "proposed"].includes(appointment.status)
            );
          }).length;
          
          setKpiData(prev => ({ ...prev, appointments: upcomingAppointments }));
        } catch (error) {
          console.error("Error fetching appointments:", error);
        }
        
        // Fetch medication alerts
        try {
          const alertsResponse = await axiosInstance.get('/medication-review/');
          const medicationAlerts = alertsResponse.data?.notifications?.length || 0;
          setKpiData(prev => ({ ...prev, alerts: medicationAlerts }));
        } catch (error) {
          console.error("Error fetching medication alerts:", error);
        }
        
        // Fetch screening recommendations
        try {
          const screeningsResponse = await axiosInstance.get('/screening-review/');
          const recommendedScreenings = screeningsResponse.data?.screening_recommendations?.length || 0;
          setKpiData(prev => ({ ...prev, screenings: recommendedScreenings }));
        } catch (error) {
          console.error("Error fetching screening recommendations:", error);
        }
        
        // Fetch health priorities
        try {
          const prioritiesResponse = await axiosInstance.get('/patient-dashboard/');
          const healthPriorities = prioritiesResponse.data?.focus_areas?.length || 0;
          setKpiData(prev => ({ ...prev, priorities: healthPriorities }));
        } catch (error) {
          console.error("Error fetching health priorities:", error);
        }
        
      } catch (error) {
        console.error("Error fetching KPI data:", error);
        // Keep the default values on error
      } finally {
        setLoading(false);
      }
    };

    fetchKpiData();
  }, []);

  // Define the KPI tiles configuration
  const kpiTiles = [
    {
      id: "appointments",
      icon: "📅",
      label: "Upcoming Appts",
      fullLabel: "Upcoming Appointments",
      value: kpiData.appointments,
      className: "kpi-tile-appointments"
    },
    {
      id: "alerts",
      icon: "⚠️",
      label: "Medication Alerts",
      fullLabel: "Medication Alerts",
      value: kpiData.alerts,
      className: "kpi-tile-alerts"
    },
    {
      id: "screenings",
      icon: "🔍",
      label: "Recommended Tests",
      fullLabel: "Recommended Screenings",
      value: kpiData.screenings,
      className: "kpi-tile-screenings"
    },
    {
      id: "priorities",
      icon: "💡",
      label: "Health Priorities",
      fullLabel: "Health Priorities",
      value: kpiData.priorities,
      className: "kpi-tile-priorities"
    }
  ];

  // Determine if we're on a mobile viewport (for responsive label text)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 576);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 576);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="kpi-tiles-container slide-up">
      {kpiTiles.map((tile) => (
        <div
          key={tile.id}
          className={`kpi-tile ${tile.className}`}
          onClick={() => onTileClick(tile.id)}
          role="button"
          tabIndex={0}
          aria-label={`${tile.fullLabel}: ${tile.value}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onTileClick(tile.id);
              e.preventDefault();
            }
          }}
        >
          <div className="kpi-tile-icon">{tile.icon}</div>
          <div className="kpi-tile-content">
            <div className="kpi-tile-number">
              {loading ? "-" : tile.value}
            </div>
            <div className="kpi-tile-label" dangerouslySetInnerHTML={{ 
              __html: isMobile && tile.id === "screenings" 
                ? "Recommended<br/>Tests" 
                : isMobile && tile.id === "alerts"
                  ? "Medication<br/>Alerts"
                  : isMobile ? tile.label : tile.fullLabel 
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default KpiTiles; 