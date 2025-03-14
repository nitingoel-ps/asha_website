import React from "react";
import { Link } from "react-router-dom";
import "./WelcomeCard.css";

function WelcomeCard({ user }) {
  // Mock data for health score
  const healthScore = 80;
  const scorePercentage = (healthScore / 100) * 283; // 283 is the circumference of the circle with r=45
  const dashOffset = 283 - scorePercentage;

  // Quick action items
  const quickActions = [
    { icon: "📋", title: "Health Records", link: "/patient-dashboard" },
    { icon: "🎙️", title: "Talk to Asha", link: "/ai-chat" },
    { icon: "➕", title: "Add Health Data", link: "/add-health-data" },
    { icon: "💊", title: "Update Medications", link: "/patient-dashboard/med" },
    { icon: "❤️", title: "Record Vitals", link: "/patient-dashboard/vital-signs" },
    { icon: "🤒", title: "Record Symptom", link: "/patient-dashboard/symptoms" },
  ];

  return (
    <div className="welcome-card">
      <div className="welcome-header">
        <div className="welcome-message">
          <h1>Welcome back, {user?.first_name || "User"}!</h1>
          <p>Here's your health overview for today.</p>
        </div>
        <div className="health-score-container">
          <div className="score-ring">
            <svg height="80" width="80" viewBox="0 0 100 100">
              <circle className="score-circle score-background" cx="50" cy="50" r="45"></circle>
              <circle 
                className="score-circle score-value-circle" 
                cx="50" 
                cy="50" 
                r="45"
                style={{ strokeDashoffset: dashOffset }}
              ></circle>
            </svg>
            <div className="score-text">
              <div className="score-number">{healthScore}</div>
            </div>
          </div>
          <div className="score-details">
            <div className="score-label">Health Score</div>
            <div className="score-description">Based on your vitals, labs, and provider data</div>
          </div>
        </div>
      </div>
      
      <div className="quick-actions">
        {quickActions.map((action, index) => (
          <Link key={index} to={action.link} className="action-card">
            <div className="action-icon">{action.icon}</div>
            <div className="action-title">{action.title}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default WelcomeCard; 