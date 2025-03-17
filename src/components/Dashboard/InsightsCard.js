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
              Loading insights...
            </div>
          ) : error ? (
            <div className="error-insights">
              {error}
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
                <div className="category-footer">
                  <div className="more-alerts">
                    {insights.length - maxItemsToShow} more insight{insights.length - maxItemsToShow !== 1 ? 's' : ''} to review
                  </div>
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