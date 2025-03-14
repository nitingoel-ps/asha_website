import React from "react";
import { Link } from "react-router-dom";
import "./AlertsCard.css";

function AlertsCard() {
  // Mock data for alerts
  const alerts = [
    {
      id: 1,
      type: "danger",
      icon: "⚠️",
      title: "Medication Interaction Detected",
      description: "Potential interaction between Lisinopril and your new supplement. Discuss with your doctor."
    },
    {
      id: 2,
      type: "warning",
      icon: "📅",
      title: "Screening Recommendation",
      description: "Based on your age and health profile, a cholesterol screening is recommended."
    },
    {
      id: 3,
      type: "info",
      icon: "📋",
      title: "Health Record Update",
      description: "New lab results from Memorial Hospital have been added to your records."
    }
  ];

  return (
    <div className="card dashboard-grid-2x1">
      <div className="card-header">
        <div className="card-title">
          <span>🔔</span> Important Alerts
        </div>
        <Link to="/alerts" className="card-action">View All</Link>
      </div>
      <div className="card-body">
        <ul className="alert-list">
          {alerts.map(alert => (
            <li key={alert.id} className="alert-item">
              <div className={`alert-icon ${alert.type}`}>{alert.icon}</div>
              <div className="alert-content">
                <div className="alert-title">{alert.title}</div>
                <div className="alert-description">{alert.description}</div>
              </div>
            </li>
          ))}
          {alerts.length === 0 && (
            <li className="no-alerts">
              No important alerts at this time.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default AlertsCard; 