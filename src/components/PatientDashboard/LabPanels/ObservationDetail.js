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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Prepare data for the graph
  const graphData = {
    observationName: observation.name, // Changed from observation.long_name
    points: observation.values.map(v => ({
      date: v.date,
      value: v.observation_value
    })),
    uom: observation.uom,
    referenceRange: observation.ref_low !== null || observation.ref_high !== null ? {
      low: observation.ref_low,
      high: observation.ref_high
    } : null,
    explanation: observation.explanation
  };

  const HistoryItemMobile = ({ value }) => (
    <div className="history-item">
      <div className="history-item-header">
        <div className="history-item-date">{formatDate(value.date)}</div>
        <div className="history-item-value">
          {value.observation_value} {observation.uom}
          {value.is_normal === false && (
            <span className="text-warning ms-2">⚠</span>
          )}
        </div>
      </div>
      <div className="history-item-details">
        <div className="history-detail">
          <span className="detail-label">Reference Range:</span>
          <span className="detail-value">{value.observation_ref_range || 'N/A'}</span>
        </div>
        <div className="history-detail">
          <span className="detail-label">Source:</span>
          <span className="detail-value">{value.source}</span>
        </div>
        <div className="history-detail">
          <span className="detail-label">Lab:</span>
          <span className="detail-value">{value.lab}</span>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => {
    const sortedValues = observation.values
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (isMobile) {
      return (
        <div className="history-list">
          {sortedValues.map((value, index) => (
            <HistoryItemMobile key={index} value={value} />
          ))}
        </div>
      );
    }

    return (
      <Table responsive striped hover>
        <thead>
          <tr>
            <th>Date</th>
            <th>Value</th>
            <th>Reference Range</th>
            <th>Source</th>
            <th>Lab</th>
          </tr>
        </thead>
        <tbody>
          {sortedValues.map((value, index) => (
            <tr key={index}>
              <td>{formatDate(value.date)}</td>
              <td>
                {value.observation_value} {observation.uom}
                {value.is_normal === false && (
                  <span className="text-warning ms-2">⚠</span>
                )}
              </td>
              <td>{value.observation_ref_range || 'N/A'}</td>
              <td>{value.source}</td>
              <td>{value.lab}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

return (
    <div className="observation-detail-container">
        <Card className="observation-card">
            <Card.Header className="py-2">
                <div className="d-flex align-items-center">
                    <FlaskConical size={24} className="me-2" color="#667EEA"/>
                    <h5 className="mb-0">{observation.long_name}</h5>
                </div>
                <div className="text-muted">
                    <small>{panel.long_name}</small>
                </div>
            </Card.Header>
            <Card.Body className="p-0">
                <div className="graph-container">
                    <ObservationGraph data={graphData} />
                </div>

                <div className="history-section">
                    <h6 className="mb-3">Observation History</h6>
                    {renderHistory()}
                </div>
            </Card.Body>
        </Card>
    </div>
);
}

export default ObservationDetail;
