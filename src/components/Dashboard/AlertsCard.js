import React from "react";
import { Link } from "react-router-dom";
import "./AlertsCard.css";

function AlertsCard({ maxItemsPerCategory = 2 }) {
  // Mock data for medication interactions
  const medicationInteractions = [
    {
      id: 1,
      severity: "high",
      icon: "⚠️",
      title: "Lisinopril and Potassium Supplements",
      description: "This combination may lead to high potassium levels (hyperkalemia), which can cause serious heart rhythm problems."
    },
    {
      id: 2,
      severity: "medium",
      icon: "⚠️",
      title: "Simvastatin and Grapefruit Juice",
      description: "Grapefruit juice can increase the level of simvastatin in your bloodstream, potentially leading to side effects."
    },
    {
      id: 3,
      severity: "high",
      icon: "⚠️",
      title: "Warfarin and Aspirin",
      description: "This combination increases your risk of bleeding. Consult your doctor immediately."
    },
    {
      id: 4,
      severity: "low",
      icon: "⚠️",
      title: "Metformin and Vitamin B12",
      description: "Long-term use of metformin may reduce vitamin B12 absorption. Consider supplementation."
    }
  ];

  // Mock data for recommended screenings
  const recommendedScreenings = [
    {
      id: 1,
      severity: "overdue",
      icon: "📅",
      title: "Cholesterol Screening",
      description: "Your last cholesterol screening was more than 14 months ago. Based on your health profile, annual testing is recommended."
    },
    {
      id: 2,
      severity: "due-now",
      icon: "📅",
      title: "Colorectal Cancer Screening",
      description: "Based on your age and family history, it's time for your colorectal cancer screening."
    },
    {
      id: 3,
      severity: "upcoming",
      icon: "📅",
      title: "Annual Physical Exam",
      description: "Your annual physical exam is coming up in 30 days."
    }
  ];

  // Mock data for prescription refills
  const prescriptionRefills = [
    {
      id: 1,
      severity: "due-soon",
      icon: "💊",
      title: "Atorvastatin 20mg",
      description: "5 days of medication remaining. Refill is due on March 19, 2025."
    },
    {
      id: 2,
      severity: "due-soon",
      icon: "💊",
      title: "Lisinopril 10mg",
      description: "7 days of medication remaining. Refill is due on March 21, 2025."
    },
    {
      id: 3,
      severity: "upcoming",
      icon: "💊",
      title: "Metformin 500mg",
      description: "15 days of medication remaining. Refill is due on March 29, 2025."
    }
  ];

  // Helper function to count severity levels
  const countSeverityLevels = (items) => {
    return items.reduce((counts, item) => {
      counts[item.severity] = (counts[item.severity] || 0) + 1;
      return counts;
    }, {});
  };

  // Get counts for each category
  const medicationCounts = countSeverityLevels(medicationInteractions);
  const screeningCounts = countSeverityLevels(recommendedScreenings);
  const prescriptionCounts = countSeverityLevels(prescriptionRefills);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <span>🔔</span> Important Alerts
        </div>
        <Link to="/alerts" className="card-action">View All Alerts</Link>
      </div>
      <div className="card-body">
        <div className="alerts-container">
          {/* Medication Interactions Category */}
          <div className="alert-category">
            <div className="category-header">
              <div className="category-name">
                <span>💊</span> Medication Interactions
              </div>
              <div className="category-indicators">
                {medicationCounts.high > 0 && (
                  <div className="severity-indicator">
                    <span className="count-indicator high-indicator"></span>
                    {medicationCounts.high} High
                  </div>
                )}
                {medicationCounts.medium > 0 && (
                  <div className="severity-indicator">
                    <span className="count-indicator medium-indicator"></span>
                    {medicationCounts.medium} Medium
                  </div>
                )}
                {medicationCounts.low > 0 && (
                  <div className="severity-indicator">
                    <span className="count-indicator low-indicator"></span>
                    {medicationCounts.low} Low
                  </div>
                )}
              </div>
            </div>
            <div className="category-content">
              <ul className="alert-list">
                {medicationInteractions.slice(0, maxItemsPerCategory).map(alert => (
                  <li key={alert.id} className="alert-item">
                    <div className={`alert-priority ${alert.severity}-priority`}></div>
                    <div className={`alert-icon ${
                      alert.severity === "high" ? "danger-icon" : 
                      alert.severity === "medium" ? "warning-icon" : "info-icon"
                    }`}>{alert.icon}</div>
                    <div className="alert-content">
                      <div className="alert-title">{alert.title}</div>
                      <div className="alert-description">{alert.description}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {medicationInteractions.length > maxItemsPerCategory && (
              <div className="category-footer">
                <div className="more-alerts">
                  {medicationInteractions.length - maxItemsPerCategory} more medication interactions to review
                </div>
                <Link to="/alerts/medications" className="view-all">View All</Link>
              </div>
            )}
          </div>

          {/* Screenings Category */}
          <div className="alert-category">
            <div className="category-header">
              <div className="category-name">
                <span>🔍</span> Recommended Screenings
              </div>
              <div className="category-indicators">
                {screeningCounts.overdue > 0 && (
                  <div className="severity-indicator">
                    <span className="count-indicator high-indicator"></span>
                    {screeningCounts.overdue} Overdue
                  </div>
                )}
                {screeningCounts["due-now"] > 0 && (
                  <div className="severity-indicator">
                    <span className="count-indicator medium-indicator"></span>
                    {screeningCounts["due-now"]} Due Now
                  </div>
                )}
                {screeningCounts.upcoming > 0 && (
                  <div className="severity-indicator">
                    <span className="count-indicator low-indicator"></span>
                    {screeningCounts.upcoming} Upcoming
                  </div>
                )}
              </div>
            </div>
            <div className="category-content">
              <ul className="alert-list">
                {recommendedScreenings.slice(0, maxItemsPerCategory).map(alert => (
                  <li key={alert.id} className="alert-item">
                    <div className={`alert-priority ${
                      alert.severity === "overdue" ? "high-priority" : 
                      alert.severity === "due-now" ? "medium-priority" : "low-priority"
                    }`}></div>
                    <div className={`alert-icon ${
                      alert.severity === "overdue" ? "danger-icon" : 
                      alert.severity === "due-now" ? "warning-icon" : "info-icon"
                    }`}>{alert.icon}</div>
                    <div className="alert-content">
                      <div className="alert-title">{alert.title}</div>
                      <div className="alert-description">{alert.description}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {recommendedScreenings.length > maxItemsPerCategory && (
              <div className="category-footer">
                <div className="more-alerts">
                  {recommendedScreenings.length - maxItemsPerCategory} more screening recommendation{recommendedScreenings.length - maxItemsPerCategory !== 1 ? 's' : ''}
                </div>
                <Link to="/alerts/screenings" className="view-all">View All</Link>
              </div>
            )}
          </div>

          {/* Prescription Refills Category */}
          <div className="alert-category">
            <div className="category-header">
              <div className="category-name">
                <span>💊</span> Prescription Refills
              </div>
              <div className="category-indicators">
                {prescriptionCounts["due-soon"] > 0 && (
                  <div className="severity-indicator">
                    <span className="count-indicator medium-indicator"></span>
                    {prescriptionCounts["due-soon"]} Due Soon
                  </div>
                )}
                {prescriptionCounts.upcoming > 0 && (
                  <div className="severity-indicator">
                    <span className="count-indicator low-indicator"></span>
                    {prescriptionCounts.upcoming} Upcoming
                  </div>
                )}
              </div>
            </div>
            <div className="category-content">
              <ul className="alert-list">
                {prescriptionRefills.slice(0, maxItemsPerCategory).map(alert => (
                  <li key={alert.id} className="alert-item">
                    <div className={`alert-priority ${
                      alert.severity === "due-soon" ? "medium-priority" : "low-priority"
                    }`}></div>
                    <div className={`alert-icon ${
                      alert.severity === "due-soon" ? "warning-icon" : "info-icon"
                    }`}>{alert.icon}</div>
                    <div className="alert-content">
                      <div className="alert-title">{alert.title}</div>
                      <div className="alert-description">{alert.description}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {prescriptionRefills.length > maxItemsPerCategory && (
              <div className="category-footer">
                <div className="more-alerts">
                  {prescriptionRefills.length - maxItemsPerCategory} more refill{prescriptionRefills.length - maxItemsPerCategory !== 1 ? 's' : ''} to review
                </div>
                <Link to="/alerts/prescriptions" className="view-all">View All</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlertsCard; 