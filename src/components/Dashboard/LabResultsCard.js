import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlask } from "@fortawesome/free-solid-svg-icons";
import axiosInstance from "../../utils/axiosInstance";
import "./LabResultsCard.css";

function LabResultsCard() {
  const [labResults, setLabResults] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        <Link to="/lab-results" className="card-action">View All Labs</Link>
      </div>
      <div className="card-body">
        {labResults.map(lab => (
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
        ))}
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