import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button } from 'react-bootstrap';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import ObservationGraph from '../ObservationGraph';
import './ObservationDetail.css';

function ObservationDetail({ standardPanels }) {
  const { observationId } = useParams();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Find the observation by ID from any panel
  const findObservation = () => {
    console.log("In findObservation, looking for ",observationId);
    for (const panel of standardPanels || []) {
      const observation = panel.observations.find(o => o.id === observationId);
      if (observation) {
        return { panel, observation };
      }
    }
    return { panel: null, observation: null };
  };

  const { panel, observation } = findObservation();

  if (!panel || !observation) {
    return <div>Observation not found</div>;
  }

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Find reference range from observation history if not available on the observation itself
  const findReferenceRange = () => {
    // Check if observation has its own reference range
    if (observation.ref_low !== null || observation.ref_high !== null) {
      return {
        low: observation.ref_low,
        high: observation.ref_high
      };
    }
    
    // Sort values by date (newest first) to search through them
    const sortedValues = [...observation.values].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Try to find a reference range from any of the observation values
    for (const value of sortedValues) {
      if (value.observation_ref_range) {
        // Parse reference range string (typically in format "X-Y" or "< X" or "> Y")
        const rangeMatch = value.observation_ref_range.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
        if (rangeMatch) {
          return {
            low: parseFloat(rangeMatch[1]),
            high: parseFloat(rangeMatch[2])
          };
        }
        
        // Check for "less than" format
        const lessThanMatch = value.observation_ref_range.match(/\<\s*(\d+\.?\d*)/);
        if (lessThanMatch) {
          return {
            low: 0, // Assume 0 as the lower bound
            high: parseFloat(lessThanMatch[1])
          };
        }
        
        // Check for "greater than" format
        const greaterThanMatch = value.observation_ref_range.match(/\>\s*(\d+\.?\d*)/);
        if (greaterThanMatch) {
          return {
            low: parseFloat(greaterThanMatch[1]),
            high: null // No upper bound
          };
        }
      }
      
      // If there's a numeric ref_low and ref_high directly in the value
      if ((value.ref_low !== null && value.ref_low !== undefined) || 
          (value.ref_high !== null && value.ref_high !== undefined)) {
        return {
          low: value.ref_low,
          high: value.ref_high
        };
      }
    }
    
    // No reference range found
    return null;
  };

  // Prepare data for the graph
  const graphData = {
    observationName: observation.observation_name || observation.name, // Added observation_name
    points: observation.values.map(v => ({
      date: v.date,
      value: v.observation_value
    })),
    uom: observation.uom,
    referenceRange: findReferenceRange(),
    explanation: observation.explanation
  };

  // Log the reference range found for debugging
  console.log("Reference range used for graph:", graphData.referenceRange);

const HistoryItem = ({ value }) => (
    <Card className="history-card mb-3">
        <Card.Body>
            <div className="history-card-main">
                <div className="history-main-line">
                    <div className="history-name-container">
                        <span className="history-name">{value.observation_name}</span>
                    </div>
                    <div className="history-value-container">
                        <div className="value-uom-group">
                            <span className="history-value">{value.observation_value}</span>
                            <span className="history-uom">{observation.uom}</span>
                            {value.is_normal === false && (
                                <span className="abnormal-indicator">⚠ Abnormal</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="history-date">{formatDate(value.date)}</div>
            </div>
            <div className="history-details">
                <div className="detail-row">
                    <span className="detail-label">Reference Range:</span>
                    <span className="detail-value">{value.observation_ref_range || 'N/A'}</span>
                </div>
                {value.report_name && (
                    <div className="detail-row">
                        <span className="detail-label">Report:</span>
                        <span className="detail-value">{value.report_name}</span>
                    </div>
                )}
                <div className="detail-row">
                    <span className="detail-label">Lab:</span>
                    <span className="detail-value">{value.lab}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Source:</span>
                    <span 
                        className="detail-value" 
                        data-tooltip={value.source}
                    >
                        {value.source}
                    </span>
                </div>
                {value.notes && (
                    <div className="detail-row">
                        <span className="detail-label">Notes:</span>
                        <span className="detail-value">{value.notes}</span>
                    </div>
                )}
            </div>
        </Card.Body>
    </Card>
);

  const renderHistory = () => {
    const sortedValues = observation.values
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div className="history-grid">
        {sortedValues.map((value, index) => (
          <HistoryItem key={index} value={value} />
        ))}
      </div>
    );
  };

return (
    <div className="observation-detail-container">
        <Card className="observation-card">
            <Card.Header className="py-3 d-flex flex-column">
                <div className="observation-header-row mb-2 w-100">
                    <div className="observation-title-container d-flex align-items-center">
                        <FlaskConical size={24} className="me-2" color="#667EEA"/>
                        <h5 className="observation-title mb-0 me-2">{observation.observation_name || observation.name}</h5>
                    </div>
                    <div className="observation-panel-name text-muted">
                        <small>{panel.long_name}</small>
                    </div>
                </div>
                
                {observation.narrative && (
                    <div className="observation-narrative-container w-100">
                        <div className="observation-narrative-text">
                            {observation.narrative}
                        </div>
                    </div>
                )}
            </Card.Header>
            <Card.Body className="p-0">
                <div className="graph-container">
                    <ObservationGraph data={graphData} />
                </div>
            </Card.Body>
        </Card>

        <div className="history-section">
            <h5 className="mb-3">Observation History</h5>
            {renderHistory()}
        </div>
    </div>
);
}

export default ObservationDetail;
