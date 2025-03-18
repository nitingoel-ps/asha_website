import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import "./VitalsCard.css";

function VitalsCard() {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to determine vital sign status
  const determineStatus = (vital) => {
    const { vital_sign, reading } = vital;
    
    // Add your thresholds here
    switch (vital_sign) {
      case "Blood Pressure":
        const [systolic, diastolic] = reading.split("/").map(Number);
        if (systolic >= 140 || diastolic >= 90) return "alert";
        if (systolic >= 130 || diastolic >= 85) return "warning";
        return "normal";
      
      case "Pulse":
        const pulse = Number(reading);
        if (pulse > 100 || pulse < 50) return "alert";
        if (pulse > 90 || pulse < 60) return "warning";
        return "normal";
      
      case "Oxygen Saturation":
        const o2 = Number(reading);
        if (o2 < 92) return "alert";
        if (o2 < 95) return "warning";
        return "normal";
      
      case "Weight":
        return "warning"; // Since BMI was noted as concerning
      
      case "Body Mass Index":
      case "BMI":
        const bmi = Number(reading);
        if (bmi >= 30) return "alert";
        if (bmi >= 25) return "warning";
        return "normal";
      
      default:
        return "normal";
    }
  };

  useEffect(() => {
    const fetchVitals = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/vital-signs/');
        
        // Process the data to get most recent values
        const vitalMap = new Map();
        response.data.vital_signs.forEach(vital => {
          // Normalize BMI name
          const vitalName = vital.vital_sign === "BMI" ? "Body Mass Index" : vital.vital_sign;
          const existingVital = vitalMap.get(vitalName);
          if (!existingVital || new Date(vital.date_taken) > new Date(existingVital.date_taken)) {
            vitalMap.set(vitalName, {...vital, vital_sign: vitalName});
          }
        });

        // Convert to array and filter the vitals we want to display
        const vitalsToShow = ["Blood Pressure", "Pulse", "Oxygen Saturation", "Weight", "Body Mass Index"];
        const processedVitals = vitalsToShow
          .map(vitalName => {
            const vital = vitalMap.get(vitalName);
            if (!vital) return null;
            return {
              id: vital.id,
              name: vitalName,
              value: vital.reading,
              unit: vital.units_of_measure ? vital.units_of_measure.replace('[', '').replace(']', '') : '',
              icon: vitalName === "Blood Pressure" ? "❤️" :
                    vitalName === "Pulse" ? "📈" :
                    vitalName === "Oxygen Saturation" ? "🫁" :
                    vitalName === "Weight" ? "⚖️" : "📊",
              date: new Date(vital.date_taken).toLocaleDateString(),
              status: determineStatus(vital)
            };
          })
          .filter(vital => vital !== null); // Remove any missing vitals

        setVitals(processedVitals);
        setError(null);
      } catch (err) {
        console.error('Error fetching vital signs:', err);
        setError('No Vital Signs Available');
      } finally {
        setLoading(false);
      }
    };

    fetchVitals();
  }, []);

  if (loading) {
    return (
      <div className="card dashboard-grid-3x1">
        <div className="card-header">
          <div className="card-title">
            <span>❤️</span> Key Vitals
          </div>
          <Link to="/patient-dashboard/vital-signs" className="card-action">View All Vitals</Link>
        </div>
        <div className="card-body">
          <div className="loading-state">Loading vital signs...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card dashboard-grid-3x1">
        <div className="card-header">
          <div className="card-title">
            <span>❤️</span> Key Vitals
          </div>
          <Link to="/patient-dashboard/vital-signs" className="card-action">View All Vitals</Link>
        </div>
        <div className="card-body">
          <div className="error-state">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card dashboard-grid-3x1">
      <div className="card-header">
        <div className="card-title">
          <span>❤️</span> Key Vitals
        </div>
        <Link to="/patient-dashboard/vital-signs" className="card-action">View All Vitals</Link>
      </div>
      <div className="card-body">
        <div className="mini-vitals-bar">
          {vitals.map(vital => (
            <div key={vital.id} className="mini-vital">
              <div className="mini-vital-icon">{vital.icon}</div>
              <div className="mini-vital-data">
                <div className="mini-vital-label">{vital.name}</div>
                <div className="mini-vital-reading">
                  {vital.value} <span className="mini-vital-unit">{vital.unit}</span>
                  <span className={`status-dot status-${vital.status}`}></span>
                </div>
              </div>
            </div>
          ))}
          {vitals.length === 0 && (
            <div className="no-vitals">
              No vital signs available in the records yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VitalsCard; 