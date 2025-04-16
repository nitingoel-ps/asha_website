import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlask, faList, faGrip } from "@fortawesome/free-solid-svg-icons";
import axiosInstance from "../../utils/axiosInstance";
import { useConnection } from "../../context/ConnectionContext";
import "./LabResultsCard.css";

function LabResultsCard() {
  const [labResults, setLabResults] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDetailedView, setIsDetailedView] = useState(false);
  const { getEmptyStateMessage, isLoading: connectionLoading } = useConnection();

  useEffect(() => {
    const fetchLabResults = async () => {
      try {
        const response = await axiosInstance.get('/important-charts/');
        // Handle null response for important_charts
        if (response.data?.important_charts === null) {
          // This is an expected case when there are no lab results yet
          setLabResults([]);
        } else if (Array.isArray(response.data?.important_charts)) {
          // Sort the lab results by severity
          const sortedResults = response.data.important_charts.sort((a, b) => {
            const statusA = getBadgeStatus(a);
            const statusB = getBadgeStatus(b);
            
            // Define priority order: High/Low -> Borderline -> Normal -> No Range
            const getPriority = (status) => {
              switch (status) {
                case "High":
                case "Low":
                  return 0;
                case "Borderline High":
                case "Borderline Low":
                  return 1;
                case "Normal":
                  return 2;
                default:
                  return 3;
              }
            };
            
            return getPriority(statusA) - getPriority(statusB);
          });
          
          setLabResults(sortedResults);
          setLastUpdated(response.data.last_updated);
        } else {
          setLabResults([]);
          setError('Invalid data format received from server');
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch lab results');
        setLabResults([]); // Ensure we set empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchLabResults();
  }, []);

  // Function to determine badge status based on values and reference ranges
  const getBadgeStatus = (result) => {
    const value = parseFloat(result.most_recent_value);
    const refLow = result.ref_low;
    const refHigh = result.ref_high;
    
    // Define borderline thresholds (5% of range or fixed percentage of limit)
    const getBorderlineThreshold = (limit) => limit * 0.05;

    if (refLow !== null && refHigh !== null) {
      // Both limits exist
      const borderlineThreshold = getBorderlineThreshold(refHigh - refLow);
      
      if (value < refLow) {
        return value >= refLow - borderlineThreshold ? "Borderline Low" : "Low";
      }
      if (value > refHigh) {
        return value <= refHigh + borderlineThreshold ? "Borderline High" : "High";
      }
      
      // Check borderline within normal range
      if (value <= refLow + borderlineThreshold) return "Borderline Low";
      if (value >= refHigh - borderlineThreshold) return "Borderline High";
      
      return "Normal";
    } else if (refHigh !== null) {
      // Only high limit exists
      const borderlineThreshold = getBorderlineThreshold(refHigh);
      
      if (value > refHigh) {
        return value <= refHigh + borderlineThreshold ? "Borderline High" : "High";
      }
      if (value >= refHigh - borderlineThreshold) return "Borderline High";
      
      return "Normal";
    } else if (refLow !== null) {
      // Only low limit exists
      const borderlineThreshold = getBorderlineThreshold(refLow);
      
      if (value < refLow) {
        return value >= refLow - borderlineThreshold ? "Borderline Low" : "Low";
      }
      if (value <= refLow + borderlineThreshold) return "Borderline Low";
      
      return "Normal";
    }
    
    return "No Range";
  };

  // Function to get badge color class
  const getBadgeColorClass = (status) => {
    switch (status) {
      case "High":
        return "badge-high";
      case "Low":
        return "badge-low";
      case "Borderline High":
      case "Borderline Low":
        return "badge-borderline";
      case "Normal":
        return "badge-normal";
      default:
        return "badge-no-range";
    }
  };

  // Function to get compact status class
  const getCompactStatusClass = (result) => {
    const status = getBadgeStatus(result);
    switch (status) {
      case "High":
      case "Low":
        return "compact-danger";
      case "Borderline High":
      case "Borderline Low":
        return "compact-warning";
      case "Normal":
        return "compact-normal";
      default:
        return "compact-normal";
    }
  };

  // Function to format reference range text
  const formatReferenceRange = (result) => {
    if (result.ref_low !== null && result.ref_high !== null) {
      return `${result.ref_low}-${result.ref_high}`;
    } else if (result.ref_low !== null) {
      return `>${result.ref_low}`;
    } else if (result.ref_high !== null) {
      return `<${result.ref_high}`;
    }
    return "No range";
  };

  // Function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Render empty or loading state
  const renderStateMessage = () => {
    if (loading || connectionLoading) {
      return (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading lab results...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="error-state">{error}</div>
      );
    }
    
    const emptyMessage = getEmptyStateMessage('labs');
    
    return (
      <div className="empty-state-container">
        {emptyMessage.heading ? (
          <>
            <FontAwesomeIcon icon={faFlask} className="empty-state-icon" />
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
    <div className="card dashboard-grid-3x1">
      <div className="card-header lab-results-header card-header-single-line">
        <div className="card-title">
          <FontAwesomeIcon icon={faFlask} /> Key Lab Results
        </div>
        <Link to="/patient-dashboard/lab-panels" className="card-action">View All Labs</Link>
      </div>
      <div className="lab-view-toggle">
        <label className={`view-toggle-label ${loading || connectionLoading || labResults.length === 0 ? 'disabled' : ''}`}>
          Detailed View
          <div className={`toggle-switch ${loading || connectionLoading || labResults.length === 0 ? 'disabled' : ''}`}>
            <input
              type="checkbox"
              checked={isDetailedView}
              onChange={(e) => setIsDetailedView(e.target.checked)}
              disabled={loading || connectionLoading || labResults.length === 0}
            />
            <span className="toggle-slider"></span>
          </div>
        </label>
      </div>
      <div className="card-body">
        {loading || connectionLoading || labResults.length === 0 ? (
          renderStateMessage()
        ) : !isDetailedView ? (
          <div className="lab-kpi-compact-grid">
            {labResults.map(lab => (
              <Link 
                to={`/patient-dashboard/observation/${lab.id}`} 
                key={lab.id} 
                className="lab-kpi-compact"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className={`compact-status ${getCompactStatusClass(lab)}`}></div>
                <div className="compact-info">
                  <div className="compact-name">{lab.name}</div>
                  <div className="compact-value">
                    {lab.most_recent_value} <span className="compact-unit">{lab.uom}</span>
                  </div>
                  <div className="compact-range">
                    {getBadgeStatus(lab)} (Ref: {formatReferenceRange(lab)})
                  </div>
                  <div className="compact-date">{formatDate(lab.most_recent_date)}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          labResults.map(lab => (
            <Link 
              to={`/patient-dashboard/observation/${lab.id}`} 
              key={lab.id} 
              className="lab-item"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="lab-icon">
                <FontAwesomeIcon icon={faFlask} />
              </div>
              <div className="lab-info">
                <div className="lab-name">{lab.name}</div>
                <div className="lab-result">
                  {lab.most_recent_value} {lab.uom}
                  <span className={`badge ${getBadgeColorClass(getBadgeStatus(lab))}`}>
                    {getBadgeStatus(lab)}
                  </span>
                </div>
                <div className="lab-reason">
                  {lab.reason}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export default LabResultsCard; 