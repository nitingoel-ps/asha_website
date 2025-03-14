import React from "react";
import { Link } from "react-router-dom";
import "./VitalsCard.css";

function VitalsCard() {
  // Mock data for vitals
  const vitals = [
    {
      id: 1,
      name: "Blood Pressure",
      value: "100/64",
      unit: "mmHg",
      icon: "❤️",
      date: "Feb 5, 2025"
    },
    {
      id: 2,
      name: "Pulse",
      value: "82",
      unit: "bpm",
      icon: "📈",
      date: "Mar 11, 2025"
    },
    {
      id: 3,
      name: "Oxygen Saturation",
      value: "99",
      unit: "%",
      icon: "🫁",
      date: "Feb 5, 2025"
    },
    {
      id: 4,
      name: "Weight",
      value: "198.6",
      unit: "lb",
      icon: "⚖️",
      date: "Mar 7, 2025"
    }
  ];

  return (
    <div className="card dashboard-grid-3x1">
      <div className="card-header">
        <div className="card-title">
          <span>❤️</span> Key Vitals
        </div>
        <Link to="/vitals" className="card-action">View All Vitals</Link>
      </div>
      <div className="card-body">
        <div className="vital-grid">
          {vitals.map(vital => (
            <div key={vital.id} className="vital-card">
              <div className="vital-date">{vital.date}</div>
              <div className="vital-icon">{vital.icon}</div>
              <div className="vital-value">{vital.value}</div>
              <div className="vital-name">{vital.name}</div>
              <div className="vital-unit">{vital.unit}</div>
            </div>
          ))}
          {vitals.length === 0 && (
            <div className="no-vitals">
              No vital signs recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VitalsCard; 