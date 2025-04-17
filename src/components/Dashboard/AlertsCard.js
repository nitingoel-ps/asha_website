import React, { useState, useEffect } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { useConnection } from "../../context/ConnectionContext";
import { Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquareMore, X } from "lucide-react";
import "./AlertsCard.css";

function AlertsCard({ maxItemsPerCategory = 2 }) {
  const navigate = useNavigate();
  const [medicationInteractions, setMedicationInteractions] = useState([]);
  const [recommendedScreenings, setRecommendedScreenings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllMedications, setShowAllMedications] = useState(false);
  const [showAllScreenings, setShowAllScreenings] = useState(false);
  const [showAllRefills, setShowAllRefills] = useState(false);
  const [screeningsLoading, setScreeningsLoading] = useState(true);
  const [screeningsError, setScreeningsError] = useState(null);
  // Add state to track expanded items
  const [expandedItems, setExpandedItems] = useState({});
  // Add state to track dismissed alerts
  const [dismissedAlerts, setDismissedAlerts] = useState({});
  
  // Get connection status info from context
  const { getEmptyStateMessage, connectionStatus, isLoading: connectionLoading } = useConnection();
  // Track if we've successfully reached the medication API
  const [medicationsDataFetched, setMedicationsDataFetched] = useState(false);
  const [screeningsDataFetched, setScreeningsDataFetched] = useState(false);

  // Log connection status whenever it changes
  useEffect(() => {
    console.log("🔄 Connection status changed:", connectionStatus);
    console.log("🔄 Connection loading:", connectionLoading);
  }, [connectionStatus, connectionLoading]);

  // Function to toggle item expansion
  const toggleItemExpansion = (id, category) => {
    setExpandedItems(prev => ({
      ...prev,
      [`${category}-${id}`]: !prev[`${category}-${id}`]
    }));
  };

  // Function to handle the "Learn More" action
  const handleLearnMore = (e, alert, category) => {
    e.stopPropagation(); // Prevent triggering parent card click
    
    // Create an initial message with context from the alert
    const initialMessage = `I want to learn more about this health alert:\n\nCategory: ${
      category === 'medications' ? 'Medication Interaction' : 
      category === 'screenings' ? 'Recommended Screening' : 'Prescription Refill'
    }\nTitle: ${alert.title}\nDetails: ${alert.description}`;
    
    // Navigate to AI chat with the message as state
    navigate('/ai-chat', { 
      state: { 
        initialMessage 
      }
    });
  };

  // Function to handle the "Dismiss" action
  const handleDismiss = (e, alertId, category) => {
    e.stopPropagation(); // Prevent triggering parent card click
    
    // Update dismissed alerts state
    setDismissedAlerts(prev => ({
      ...prev,
      [`${category}-${alertId}`]: true
    }));
  };

  // Define severity order for sorting
  const severityOrder = {
    high: 0,
    medium: 1,
    low: 2
  };

  useEffect(() => {
    const fetchMedicationInteractions = async () => {
      try {
        console.log("⏳ Starting medication interactions fetch");
        setIsLoading(true);
        const response = await axiosInstance.get('/medication-review/');
        setMedicationsDataFetched(true);
        console.log("✅ Medication interactions API call successful");
        
        // Add null check and default to empty array if notifications is undefined
        const notificationsData = response.data?.notifications || [];
        console.log("📊 Medication notifications data:", notificationsData);
        
        const transformedData = notificationsData.map((item, index) => ({
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
        console.log("📋 Processed medication interactions:", sortedData.length);
      } catch (err) {
        setError('Failed to fetch medication interactions');
        console.error('❌ Error fetching medication interactions:', err);
        // Set empty array on error
        setMedicationInteractions([]);
      } finally {
        setIsLoading(false);
        console.log("🏁 Medication interactions fetch complete, loading set to false");
      }
    };

    fetchMedicationInteractions();
  }, []);

  // Fetch recommended screenings
  useEffect(() => {
    const fetchRecommendedScreenings = async () => {
      try {
        console.log("⏳ Starting screening recommendations fetch");
        setScreeningsLoading(true);
        const response = await axiosInstance.get('/screening-review/');
        setScreeningsDataFetched(true);
        console.log("✅ Screening recommendations API call successful");
        
        // Add null check and default to empty array if screening_recommendations is undefined
        const screeningsData = response.data?.screening_recommendations || [];
        console.log("📊 Screening recommendations data:", screeningsData);
        
        const transformedData = screeningsData.map((item, index) => ({
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
        console.log("📋 Processed screening recommendations:", sortedData.length);
      } catch (err) {
        setScreeningsError('Failed to fetch screening recommendations');
        console.error('❌ Error fetching screening recommendations:', err);
        // Set empty array on error
        setRecommendedScreenings([]);
      } finally {
        setScreeningsLoading(false);
        console.log("🏁 Screening recommendations fetch complete, loading set to false");
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

  // Helper function to count severity levels of non-dismissed alerts
  const countSeverityLevels = (items, category) => {
    return items
      .filter(item => !dismissedAlerts[`${category}-${item.id}`])
      .reduce((counts, item) => {
        counts[item.severity] = (counts[item.severity] || 0) + 1;
        return counts;
      }, {});
  };

  // Get counts for each category
  const medicationCounts = countSeverityLevels(medicationInteractions, 'medications');
  const screeningCounts = countSeverityLevels(recommendedScreenings, 'screenings');
  const prescriptionCounts = countSeverityLevels(prescriptionRefills, 'refills');

  // Log state when medications section is being rendered
  useEffect(() => {
    console.log("🔍 Debug medication section state:", {
      connectionStatus,
      connectionLoading,
      isLoading,
      error,
      medicationsDataFetched,
      medicationInteractionsLength: medicationInteractions.length
    });
  }, [connectionStatus, connectionLoading, isLoading, error, medicationsDataFetched, medicationInteractions]);

  // Log state when screenings section is being rendered
  useEffect(() => {
    console.log("🔍 Debug screenings section state:", {
      connectionStatus,
      connectionLoading,
      screeningsLoading,
      screeningsError,
      screeningsDataFetched,
      recommendedScreeningsLength: recommendedScreenings.length
    });
  }, [connectionStatus, connectionLoading, screeningsLoading, screeningsError, screeningsDataFetched, recommendedScreenings]);

  // Empty state renderer
  const renderEmptyState = (section, loadingState, errorState, dataFetched = false) => {
    console.log(`🖼️ Rendering empty state for ${section}:`, {
      section,
      loadingState,
      errorState,
      dataFetched,
      connectionStatus,
      connectionLoading
    });
    
    if (loadingState || connectionLoading) {
      console.log(`⏳ Showing loading state for ${section} (loadingState: ${loadingState}, connectionLoading: ${connectionLoading})`);
      return (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading {section}...</p>
        </div>
      );
    }
    
    if (errorState) {
      console.log(`❌ Showing error state for ${section}: ${errorState}`);
      return (
        <div className="empty-state-container">
          <span className="empty-state-icon">{section === 'medications' ? '💊' : '🔍'}</span>
          <h3>Unable to Load {section}</h3>
          <p>{errorState}</p>
        </div>
      );
    }
    
    // For SUCCESS connectionStatus, only show "No data" message if we've successfully fetched from API
    if (connectionStatus === "SUCCESS" && !dataFetched) {
      console.log(`⏳ Showing loading for ${section} because connectionStatus is SUCCESS but dataFetched is false`);
      return (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading {section}...</p>
        </div>
      );
    }
    
    const emptyMessage = getEmptyStateMessage(section);
    console.log(`📝 Using empty message for ${section}:`, emptyMessage);
    
    return (
      <div className="empty-state-container">
        {emptyMessage.heading ? (
          <>
            <span className="empty-state-icon">{section === 'medications' ? '💊' : '🔍'}</span>
            <h3>{emptyMessage.heading}</h3>
          </>
        ) : null}
        <p>{emptyMessage.message}</p>
        {emptyMessage.action && (
          <Link to="/add-providers">
            <Button variant="primary" size="sm" className="mt-2">
              {emptyMessage.action}
            </Button>
          </Link>
        )}
      </div>
    );
  };

  return (
    <div className="alerts-wrapper">
      {/* Medication Interactions Card */}
      <div className="alert-card-container">
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
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading medication interactions...</p>
              </div>
            ) : error ? (
              <div className="error-state">{error}</div>
            ) : medicationInteractions.length === 0 ? (
              (() => {
                console.log("🚩 Medication interactions decision point:", {
                  connectionStatus,
                  medicationsDataFetched,
                  isLoading,
                  error
                });
                return renderEmptyState('medications', isLoading, error, medicationsDataFetched);
              })()
            ) : (
              <ul className="alert-list">
                {medicationInteractions
                  .filter(alert => !dismissedAlerts[`medications-${alert.id}`]) // Filter out dismissed alerts
                  .slice(0, showAllMedications ? undefined : maxItemsPerCategory)
                  .map(alert => (
                  <li 
                    key={alert.id} 
                    className={`alert-item ${expandedItems[`medications-${alert.id}`] ? 'expanded' : ''}`}
                    onClick={() => toggleItemExpansion(alert.id, 'medications')}
                  >
                    <div className={`alert-priority ${alert.severity}-priority`}></div>
                    <div className={`alert-icon ${
                      alert.severity === "high" ? "danger-icon" : 
                      alert.severity === "medium" ? "warning-icon" : "info-icon"
                    }`}>{alert.icon}</div>
                    <div className="alert-content">
                      <div className="alert-title">{alert.title}</div>
                      {expandedItems[`medications-${alert.id}`] && (
                        <>
                          <div className="alert-description">{alert.description}</div>
                          <div className="alert-actions">
                            <button 
                              className="alert-action-button learn-more"
                              onClick={(e) => handleLearnMore(e, alert, 'medications')}
                              title="Learn more about this alert"
                            >
                              <MessageSquareMore size={18} />
                              <span>Learn More</span>
                            </button>
                            <button 
                              className="alert-action-button dismiss"
                              onClick={(e) => handleDismiss(e, alert.id, 'medications')}
                              title="Dismiss this alert"
                            >
                              <X size={18} />
                              <span>Dismiss</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!isLoading && !error && medicationInteractions.length > 0 && (
              <div className="card-footer">
                {!showAllMedications && (
                  <div className="more-alerts">
                    {medicationInteractions.filter(alert => !dismissedAlerts[`medications-${alert.id}`]).length > maxItemsPerCategory 
                      ? medicationInteractions.filter(alert => !dismissedAlerts[`medications-${alert.id}`]).length - maxItemsPerCategory 
                      : 0} more
                  </div>
                )}
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
      </div>

      {/* Screenings Card */}
      <div className="alert-card-container">
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
              <div className="error-state">{screeningsError}</div>
            ) : recommendedScreenings.length === 0 ? (
              (() => {
                console.log("🚩 Screening recommendations decision point:", {
                  connectionStatus,
                  screeningsDataFetched,
                  screeningsLoading,
                  screeningsError
                });
                return renderEmptyState('screenings', screeningsLoading, screeningsError, screeningsDataFetched);
              })()
            ) : (
              <ul className="alert-list">
                {recommendedScreenings
                  .filter(alert => !dismissedAlerts[`screenings-${alert.id}`]) // Filter out dismissed alerts
                  .slice(0, showAllScreenings ? undefined : maxItemsPerCategory)
                  .map(alert => (
                  <li 
                    key={alert.id} 
                    className={`alert-item ${expandedItems[`screenings-${alert.id}`] ? 'expanded' : ''}`}
                    onClick={() => toggleItemExpansion(alert.id, 'screenings')}
                  >
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
                      {expandedItems[`screenings-${alert.id}`] && (
                        <>
                          <div className="alert-description">{alert.description}</div>
                          <div className="alert-actions">
                            <button 
                              className="alert-action-button learn-more"
                              onClick={(e) => handleLearnMore(e, alert, 'screenings')}
                              title="Learn more about this screening"
                            >
                              <MessageSquareMore size={18} />
                              <span>Learn More</span>
                            </button>
                            <button 
                              className="alert-action-button dismiss"
                              onClick={(e) => handleDismiss(e, alert.id, 'screenings')}
                              title="Dismiss this screening"
                            >
                              <X size={18} />
                              <span>Dismiss</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!screeningsLoading && !screeningsError && recommendedScreenings.length > 0 && (
              <div className="card-footer">
                {!showAllScreenings && (
                  <div className="more-alerts">
                    {recommendedScreenings.filter(alert => !dismissedAlerts[`screenings-${alert.id}`]).length > maxItemsPerCategory 
                      ? recommendedScreenings.filter(alert => !dismissedAlerts[`screenings-${alert.id}`]).length - maxItemsPerCategory 
                      : 0} more
                  </div>
                )}
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
      </div>

      {/* Prescription Refills Card */}
      {prescriptionRefills.length > 0 && (
        <div className="alert-card-container">
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
                {prescriptionRefills
                  .filter(alert => !dismissedAlerts[`refills-${alert.id}`]) // Filter out dismissed alerts
                  .slice(0, showAllRefills ? undefined : maxItemsPerCategory)
                  .map(alert => (
                  <li 
                    key={alert.id} 
                    className={`alert-item ${expandedItems[`refills-${alert.id}`] ? 'expanded' : ''}`}
                    onClick={() => toggleItemExpansion(alert.id, 'refills')}
                  >
                    <div className={`alert-priority ${
                      alert.severity === "due-soon" ? "medium-priority" : "low-priority"
                    }`}></div>
                    <div className={`alert-icon ${
                      alert.severity === "due-soon" ? "warning-icon" : "info-icon"
                    }`}>{alert.icon}</div>
                    <div className="alert-content">
                      <div className="alert-title">{alert.title}</div>
                      {expandedItems[`refills-${alert.id}`] && (
                        <>
                          <div className="alert-description">{alert.description}</div>
                          <div className="alert-actions">
                            <button 
                              className="alert-action-button learn-more"
                              onClick={(e) => handleLearnMore(e, alert, 'refills')}
                              title="Learn more about this prescription"
                            >
                              <MessageSquareMore size={18} />
                              <span>Learn More</span>
                            </button>
                            <button 
                              className="alert-action-button dismiss"
                              onClick={(e) => handleDismiss(e, alert.id, 'refills')}
                              title="Dismiss this prescription reminder"
                            >
                              <X size={18} />
                              <span>Dismiss</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {prescriptionRefills.length > 0 && (
                <div className="card-footer">
                  {!showAllRefills && (
                    <div className="more-alerts">
                      {prescriptionRefills.filter(alert => !dismissedAlerts[`refills-${alert.id}`]).length > maxItemsPerCategory 
                        ? prescriptionRefills.filter(alert => !dismissedAlerts[`refills-${alert.id}`]).length - maxItemsPerCategory 
                        : 0} more
                    </div>
                  )}
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
        </div>
      )}
    </div>
  );
}

export default AlertsCard; 