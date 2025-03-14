import React from "react";
import { Link } from "react-router-dom";
import "./LabResultsCard.css";

function LabResultsCard() {
  // Mock data for lab results
  const labResults = [
    {
      id: 1,
      name: "Total Cholesterol",
      result: "185 mg/dL",
      status: "normal"
    },
    {
      id: 2,
      name: "HDL Cholesterol",
      result: "52 mg/dL",
      status: "normal"
    },
    {
      id: 3,
      name: "Glucose (Fasting)",
      result: "102 mg/dL",
      status: "borderline"
    },
    {
      id: 4,
      name: "Hemoglobin A1C",
      result: "5.7 %",
      status: "borderline"
    }
  ];

  // Function to get status text
  const getStatusText = (status) => {
    switch(status) {
      case "normal":
        return "Normal";
      case "abnormal":
        return "Abnormal";
      case "borderline":
        return "Borderline";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="card dashboard-grid-3x1">
      <div className="card-header">
        <div className="card-title">
          <span>🧪</span> Key Lab Results
        </div>
        <Link to="/lab-results" className="card-action">View All Labs</Link>
      </div>
      <div className="card-body">
        {labResults.map(lab => (
          <div key={lab.id} className="lab-item">
            <div className="lab-icon">🧪</div>
            <div className="lab-info">
              <div className="lab-name">{lab.name}</div>
              <div className="lab-result">{lab.result}</div>
            </div>
            <div className="lab-status">
              <div className={`status-indicator status-${lab.status}`}></div>
              <div className={`status-text ${lab.status}`}>{getStatusText(lab.status)}</div>
            </div>
          </div>
        ))}
        {labResults.length === 0 && (
          <div className="no-labs">
            No lab results available.
          </div>
        )}
      </div>
    </div>
  );
}

export default LabResultsCard; 