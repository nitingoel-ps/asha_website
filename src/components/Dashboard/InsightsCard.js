import React from "react";
import { Link } from "react-router-dom";
import "./InsightsCard.css";

function InsightsCard() {
  // Mock data for insights
  const insights = [
    {
      id: 1,
      title: "Blood Pressure Improvement",
      content: "Your blood pressure has shown consistent improvement over the past 3 months. Continue with your current medication and exercise routine.",
      icon: "💡"
    },
    {
      id: 2,
      title: "Pre-Diabetic Risk",
      content: "Your borderline glucose and A1C levels suggest pre-diabetic risk. Consider reducing refined carbohydrates and scheduling a follow-up with your provider.",
      icon: "💡"
    },
    {
      id: 3,
      title: "Weight Management",
      content: "Your BMI of 28.82 indicates being overweight. A 5-10% weight reduction could significantly improve your overall health metrics and reduce pre-diabetic risk.",
      icon: "💡"
    }
  ];

  return (
    <div className="card dashboard-grid-3x1">
      <div className="card-header">
        <div className="card-title">
          <span>💡</span> AI Health Insights
        </div>
        <Link to="/insights" className="card-action">View All Insights</Link>
      </div>
      <div className="card-body">
        <div className="insights-list">
          {insights.map(insight => (
            <div key={insight.id} className="insight-item">
              <div className="insight-header">
                <div className="insight-icon">{insight.icon}</div>
                <div className="insight-title">{insight.title}</div>
              </div>
              <div className="insight-content">
                {insight.content}
              </div>
            </div>
          ))}
          {insights.length === 0 && (
            <div className="no-insights">
              No AI insights available at this time.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InsightsCard; 