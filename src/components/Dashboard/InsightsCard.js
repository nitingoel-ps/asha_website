import React, { useState, useEffect } from "react";
import axiosInstance from "../../utils/axiosInstance";
import "./InsightsCard.css";

function InsightsCard() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllInsights, setShowAllInsights] = useState(false);
  const maxItemsToShow = 3;

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await axiosInstance.get('/key-insights/');
        const formattedInsights = response.data.insights.map((insight, index) => ({
          id: index + 1,
          title: insight.heading,
          content: insight.narration,
          icon: "💡"
        }));
        setInsights(formattedInsights);
      } catch (err) {
        setError('Failed to load insights. Please try again later.');
        console.error('Error fetching insights:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  return (
    <div className="card dashboard-grid-3x1">
      <div className="card-header">
        <div className="card-title">
          <span>💡</span> AI Health Insights
        </div>
      </div>
      <div className="card-body">
        <div className="insights-list">
          {loading ? (
            <div className="loading-insights">
              <div className="loading-spinner"></div>
              <p>Analyzing your health data...</p>
            </div>
          ) : error ? (
            <div className="empty-state-container">
              <span className="empty-state-icon">💡</span>
              <h3>Unable to Load Insights</h3>
              <p>There are no insights available at this time. Once Asha is done reviewing your records, you will see them here.</p>
            </div>
          ) : insights.length > 0 ? (
            <>
              {insights.slice(0, showAllInsights ? undefined : maxItemsToShow).map(insight => (
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
              {insights.length > maxItemsToShow && (
                <div className="card-footer">
                  {!showAllInsights && (
                    <div className="more-alerts">
                      {insights.length - maxItemsToShow} more
                    </div>
                  )}
                  <button 
                    className="view-all-button"
                    onClick={() => setShowAllInsights(!showAllInsights)}
                  >
                    {showAllInsights ? 'Show Less' : 'View All'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state-container">
              <span className="empty-state-icon">💡</span>
              <h3>No Insights Available</h3>
              <p>We'll analyze your health data and provide personalized insights as more information becomes available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InsightsCard; 