import React, { useState, useEffect } from "react";
import axiosInstance from "../../utils/axiosInstance";
import "./AlertsCard.css";

function AlertsCard({ maxItemsPerCategory = 2 }) {
  const [medicationInteractions, setMedicationInteractions] = useState([]);
  const [recommendedScreenings, setRecommendedScreenings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllMedications, setShowAllMedications] = useState(false);
  const [showAllScreenings, setShowAllScreenings] = useState(false);
  const [showAllRefills, setShowAllRefills] = useState(false);
  const [screeningsLoading, setScreeningsLoading] = useState(true);
  const [screeningsError, setScreeningsError] = useState(null);

  // Define severity order for sorting
  const severityOrder = {
    high: 0,
    medium: 1,
    low: 2
  };

  useEffect(() => {
    const fetchMedicationInteractions = async () => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.get('/medication-review/');
        const transformedData = response.data.notifications.map((item, index) => ({
          id: index + 1,
          severity: item.severity,
          icon: "⚠️",
          title: `${item.medication.charAt(0).toUpperCase() + item.medication.slice(1)} Interaction`,
          description: `${item.notification} ${item.recommendation}`
        }));
        
        // Sort the data by severity
        const sortedData = [...transformedData].sort((a, b) => 
          severityOrder[a.severity] - severityOrder[b.severity]
        );
        
        setMedicationInteractions(sortedData);
      } catch (err) {
        setError('Failed to fetch medication interactions');
        console.error('Error fetching medication interactions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedicationInteractions();
  }, []);

  // Fetch recommended screenings
  useEffect(() => {
    const fetchRecommendedScreenings = async () => {
      try {
        setScreeningsLoading(true);
        const response = await axiosInstance.get('/screening-review/');
        const transformedData = response.data.screening_recommendations.map((item, index) => ({
          id: index + 1,
          severity: item.priority,
          icon: "📅",
          title: item.screening_name,
          description: `${item.rationale} ${item.timeframe}${item.special_instructions ? ` ${item.special_instructions}` : ''}${item.last_done !== 'unknown' ? ` Last done: ${item.last_done}` : ''}`
        }));

        // Sort the data by priority
        const sortedData = [...transformedData].sort((a, b) => 
          severityOrder[a.severity] - severityOrder[b.severity]
        );

        setRecommendedScreenings(sortedData);
      } catch (err) {
        setScreeningsError('Failed to fetch screening recommendations');
        console.error('Error fetching screening recommendations:', err);
      } finally {
        setScreeningsLoading(false);
      }
    };

    fetchRecommendedScreenings();
  }, []);

  // Mock data for prescription refills
  const prescriptionRefills = [
  /*
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
    */
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
    <>
      {/* Medication Interactions Card */}
      <div className="card">
        <div className="card-header alerts-header">
          <div className="card-title">
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
        <div className="card-body">
          {isLoading ? (
            <div className="loading-state">Loading medication interactions...</div>
          ) : error ? (
            <div className="error-state">{error}</div>
          ) : medicationInteractions.length === 0 ? (
            <div className="empty-state-container">
              <span className="empty-state-icon">💊</span>
              <h3>No Medication Interactions</h3>
              <p>No medication interactions found.</p>
            </div>
          ) : (
            <ul className="alert-list">
              {medicationInteractions.slice(0, showAllMedications ? undefined : maxItemsPerCategory).map(alert => (
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
          )}
          {!isLoading && !error && medicationInteractions.length > maxItemsPerCategory && (
            <div className="card-footer">
              <div className="more-alerts">
                {medicationInteractions.length - maxItemsPerCategory} more medication interaction{medicationInteractions.length - maxItemsPerCategory !== 1 ? 's' : ''} to review
              </div>
              <button 
                className="view-all-button"
                onClick={() => setShowAllMedications(!showAllMedications)}
              >
                {showAllMedications ? "Show Less" : "View All"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Screenings Card */}
      <div className="card">
        <div className="card-header alerts-header">
          <div className="card-title">
            <span>🔍</span> Recommended Screenings
          </div>
          <div className="category-indicators">
            {!screeningsLoading && !screeningsError && (
              <>
                {screeningCounts.high > 0 && (
                  <div className="severity-indicator">
                    <span className="count-indicator high-indicator"></span>
                    {screeningCounts.high} High
                  </div>
                )}
                {screeningCounts.medium > 0 && (
                  <div className="severity-indicator">
                    <span className="count-indicator medium-indicator"></span>
                    {screeningCounts.medium} Medium
                  </div>
                )}
                {screeningCounts.low > 0 && (
                  <div className="severity-indicator">
                    <span className="count-indicator low-indicator"></span>
                    {screeningCounts.low} Low
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="card-body">
          {screeningsLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading screening recommendations...</p>
            </div>
          ) : screeningsError ? (
            <div className="empty-state-container">
              <span className="empty-state-icon">🔍</span>
              <h3>Unable to Load Screenings</h3>
              <p>We don't have any screening recommendations for you right now. Once Asha is done reviewing your records, you will see them here.</p>
            </div>
          ) : recommendedScreenings.length === 0 ? (
            <div className="empty-state-container">
              <span className="empty-state-icon">🔍</span>
              <h3>No Screenings Due</h3>
              <p>You're up to date with your recommended health screenings.</p>
            </div>
          ) : (
            <ul className="alert-list">
              {recommendedScreenings.slice(0, showAllScreenings ? undefined : maxItemsPerCategory).map(alert => (
                <li key={alert.id} className="alert-item">
                  <div className={`alert-priority ${
                    alert.severity === "high" ? "high-priority" : 
                    alert.severity === "medium" ? "medium-priority" : "low-priority"
                  }`}></div>
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
          )}
          {!screeningsLoading && !screeningsError && recommendedScreenings.length > maxItemsPerCategory && (
            <div className="card-footer">
              <div className="more-alerts">
                {recommendedScreenings.length - maxItemsPerCategory} more screening recommendation{recommendedScreenings.length - maxItemsPerCategory !== 1 ? 's' : ''}
              </div>
              <button 
                className="view-all-button"
                onClick={() => setShowAllScreenings(!showAllScreenings)}
              >
                {showAllScreenings ? "Show Less" : "View All"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Prescription Refills Card */}
      {prescriptionRefills.length > 0 && (
        <div className="card">
          <div className="card-header alerts-header">
            <div className="card-title">
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
          <div className="card-body">
            <ul className="alert-list">
              {prescriptionRefills.slice(0, showAllRefills ? undefined : maxItemsPerCategory).map(alert => (
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
            {prescriptionRefills.length > maxItemsPerCategory && (
              <div className="card-footer">
                <div className="more-alerts">
                  {prescriptionRefills.length - maxItemsPerCategory} more prescription refill{prescriptionRefills.length - maxItemsPerCategory !== 1 ? 's' : ''} to review
                </div>
                <button 
                  className="view-all-button"
                  onClick={() => setShowAllRefills(!showAllRefills)}
                >
                  {showAllRefills ? "Show Less" : "View All"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default AlertsCard; 