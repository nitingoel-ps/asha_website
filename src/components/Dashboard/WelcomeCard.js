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
    { icon: "📋", title: "View Records", link: "/patient-dashboard" },
    { icon: "➕", title: "Add Records", link: "/add-health-data" },
    { icon: "🎙️", title: "Talk to Asha", link: "/new-voice-chat" },
    { icon: "💬", title: "Chat with Asha", link: "/ai-chat" },
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
            <div className="score-label">Health Awareness Score</div>
            <div className="score-description">Based on your interactions with your Health Data.</div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default WelcomeCard; 