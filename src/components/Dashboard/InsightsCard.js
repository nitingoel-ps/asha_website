import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import "./InsightsCard.css";

function InsightsCard() {
  const [healthPriorities, setHealthPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllPriorities, setShowAllPriorities] = useState(false);
  const [expandedPriorities, setExpandedPriorities] = useState({});
  const navigate = useNavigate();
  const maxItemsToShow = 3;

  const togglePriorityExpansion = (id, event) => {
    if (event) {
      event.stopPropagation();
    }
    setExpandedPriorities(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handlePriorityClick = (id) => {
    // Just expand/collapse the card instead of navigating
    togglePriorityExpansion(id);
  };

  const navigateToDetailPage = (id, event) => {
    if (event) {
      event.stopPropagation();
    }
    navigate(`/health-priorities/${id}`);
  };

  const handleViewAllClick = () => {
    navigate('/health-priorities');
  };

  useEffect(() => {
    const fetchHealthPriorities = async () => {
      try {
        const response = await axiosInstance.get('/patient-dashboard/');
        const focusAreasData = response.data?.focus_areas || [];
        
        // Sort by importance score and take the most important ones
        const formattedPriorities = focusAreasData
          .sort((a, b) => b.importance_score - a.importance_score)
          .map(priority => ({
            id: priority.id,
            title: priority.title,
            content: priority.description,
            importance_score: priority.importance_score
          }));
        
        setHealthPriorities(formattedPriorities);
      } catch (err) {
        setError('Failed to load health priorities. Please try again later.');
        console.error('Error fetching health priorities:', err);
        setHealthPriorities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHealthPriorities();
  }, []);

  return (
    <div className="card dashboard-grid-3x1">
      <div className="card-header">
        <div className="card-title">
          <span>💡</span> Suggested Health Priorities
        </div>
      </div>
      <div className="card-body">
        <div className="insights-list">
          {loading ? (
            <div className="loading-insights">
              <div className="loading-spinner"></div>
              <p>Loading health priorities...</p>
            </div>
          ) : error ? (
            <div className="empty-state-container">
              <span className="empty-state-icon">💡</span>
              <h3>Unable to Load Health Priorities</h3>
              <p>{error}</p>
            </div>
          ) : healthPriorities.length > 0 ? (
            <>
              {healthPriorities.slice(0, showAllPriorities ? undefined : maxItemsToShow).map(priority => (
                <div 
                  key={priority.id} 
                  className={`insight-item ${expandedPriorities[priority.id] ? 'expanded' : ''}`}
                  onClick={() => handlePriorityClick(priority.id)}
                >
                  <div className="insight-header">
                    <div className="insight-icon">💡</div>
                    <div className="insight-title">{priority.title}</div>
                  </div>
                  {expandedPriorities[priority.id] && (
                    <div className="insight-content">
                      {priority.content}
                    </div>
                  )}
                  {expandedPriorities[priority.id] && (
                    <div className="review-actions-link" onClick={(e) => navigateToDetailPage(priority.id, e)}>
                      Suggested Actions →
                    </div>
                  )}
                </div>
              ))}
              <div className="card-footer">
                {!showAllPriorities && healthPriorities.length > maxItemsToShow && (
                  <div className="more-alerts">
                    {healthPriorities.length - maxItemsToShow} more
                  </div>
                )}
                <button 
                  className="view-all-button"
                  onClick={handleViewAllClick}
                >
                  View All Priorities
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state-container">
              <span className="empty-state-icon">💡</span>
              <h3>No Health Priorities Available</h3>
              <p>We'll analyze your health data and provide personalized priorities as more information becomes available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InsightsCard; 