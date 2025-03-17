import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlask, faList, faGrip } from "@fortawesome/free-solid-svg-icons";
import axiosInstance from "../../utils/axiosInstance";
import "./LabResultsCard.css";

function LabResultsCard() {
  const [labResults, setLabResults] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDetailedView, setIsDetailedView] = useState(false);

  useEffect(() => {
    const fetchLabResults = async () => {
      try {
        const response = await axiosInstance.get('/important-charts/');
        // Ensure we have valid data structure
        if (response.data && Array.isArray(response.data.important_charts)) {
          setLabResults(response.data.important_charts);
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

  // Function to determine status based on values and reference ranges
  const getStatus = (result) => {
    const value = parseFloat(result.most_recent_value);
    
    if (result.ref_low !== null && value < result.ref_low) {
      return "abnormal";
    }
    if (result.ref_high !== null && value > result.ref_high) {
      return "abnormal";
    }
    return "normal";
  };

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

  if (loading) {
    return (
      <div className="card dashboard-grid-3x1">
        <div className="card-header">
          <div className="card-title">
            <FontAwesomeIcon icon={faFlask} /> Key Lab Results
          </div>
        </div>
        <div className="card-body">
          Loading lab results...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card dashboard-grid-3x1">
        <div className="card-header">
          <div className="card-title">
            <FontAwesomeIcon icon={faFlask} /> Key Lab Results
          </div>
        </div>
        <div className="card-body">
          Error loading lab results: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="card dashboard-grid-3x1">
      <div className="card-header">
        <div className="card-title">
          <FontAwesomeIcon icon={faFlask} /> Key Lab Results
        </div>
        <div className="view-toggle">
          <label className="view-toggle-label">
            Detailed View
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={isDetailedView}
                onChange={(e) => setIsDetailedView(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </div>
          </label>
          <Link to="/lab-results" className="card-action">View All Labs</Link>
        </div>
      </div>
      <div className="card-body">
        {!isDetailedView ? (
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
              <div className="lab-status">
                <div className={`status-indicator status-${getStatus(lab)}`}></div>
              </div>
            </Link>
          ))
        )}
        {labResults.length === 0 && (
          <div className="no-labs">
            No lab results available.
          </div>
        )}
      </div>
    </div>
  );
}

export default LabResultsCard; 