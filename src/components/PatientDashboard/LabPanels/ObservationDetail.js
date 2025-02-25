import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button } from 'react-bootstrap';
import { ArrowLeft, LucideTestTubes } from 'lucide-react';
import ObservationGraph from '../ObservationGraph';
import './ObservationDetail.css';

function ObservationDetail({ standardPanels }) {
  const { observationId } = useParams();
  const navigate = useNavigate();

  // Find the observation by ID from any panel
  const findObservation = () => {
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
    observationName: observation.long_name,
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

  return (
    <div className="observation-detail-container">
      <Button 
        variant="outline-primary" 
        className="mb-3"
        onClick={() => navigate('/patient-dashboard/lab-panels')}
      >
        <ArrowLeft size={16} className="me-2" />
        Back to Lab Panels
      </Button>

      <Card className="mb-4">
        <Card.Header className="d-flex align-items-center">
          <LucideTestTubes size={24} className="me-2" />
          <div>
            <h5 className="mb-0">{observation.long_name}</h5>
            <div className="text-muted">
              <small>Panel: {panel.long_name}</small>
              {observation.loinc_code && (
                <small className="ms-3">LOINC: {observation.loinc_code}</small>
              )}
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="graph-container mb-4">
            <ObservationGraph data={graphData} />
          </div>

          <div className="history-section">
            <h6 className="mb-3">Observation History</h6>
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
                {observation.values
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((value, index) => (
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
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

export default ObservationDetail;
