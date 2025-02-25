import React from 'react';
import { Card, ListGroup, Badge, Accordion } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { LucideTestTubes } from 'lucide-react';
import './LabPanelsTab.css';

function LabPanelsTab({ standardPanels }) {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getLatestObservation = (values) => {
    if (!values || values.length === 0) return null;
    return values.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  };

  const getReferenceRange = (observation, latestValue) => {
    // First try to get from the latest value
    if (latestValue?.observation_ref_range) {
      return latestValue.observation_ref_range;
    }
    
    // Otherwise use the observation's reference range
    if (observation.ref_low !== null || observation.ref_high !== null) {
      if (observation.ref_low !== null && observation.ref_high !== null) {
        return `${observation.ref_low} - ${observation.ref_high} ${observation.uom}`;
      } else if (observation.ref_low !== null) {
        return `> ${observation.ref_low} ${observation.uom}`;
      } else {
        return `< ${observation.ref_high} ${observation.uom}`;
      }
    }
    
    return 'No reference range available';
  };

  const handleObservationClick = (observationId) => {
    navigate(`/patient-dashboard/observation/${observationId}`);
  };

  if (!standardPanels || standardPanels.length === 0) {
    return <div>No lab panels available</div>;
  }

  return (
    <div className="lab-panels-container">
      <Accordion>
        {standardPanels.map((panel, index) => (
          <Accordion.Item key={panel.name} eventKey={index.toString()} className="lab-panel-card mb-4">
            <Accordion.Header>
              <div className="d-flex align-items-center w-100">
                <LucideTestTubes size={24} className="me-2" />
                <div className="panel-header-content">
                  <h5 className="mb-0">{panel.long_name}</h5>
                </div>
                <Badge bg="primary" className="ms-auto observation-count">
                  {panel.observations.length} tests
                </Badge>
              </div>
            </Accordion.Header>
            <Accordion.Body className="p-0">
              <ListGroup variant="flush">
                {panel.observations.map((observation) => {
                  const latestObs = getLatestObservation(observation.values);
                  const referenceRange = getReferenceRange(observation, latestObs);
                  
                  return (
                    <ListGroup.Item 
                      key={observation.name}
                      action
                      onClick={() => handleObservationClick(observation.id)}
                      className="observation-item"
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="observation-name">
                          <div className="observation-title">{observation.name}</div>
                          <div className="observation-subtitle text-muted">
                            {observation.long_name}
                          </div>
                          {latestObs?.is_normal === false && (
                            <Badge bg="warning" className="ms-2">
                              Out of range
                            </Badge>
                          )}
                        </div>
                        {latestObs && (
                          <div className="text-end">
                            <div className="observation-value">
                              {latestObs.observation_value} {observation.uom}
                            </div>
                            <small className="text-muted">
                              {formatDate(latestObs.date)}
                            </small>
                          </div>
                        )}
                      </div>
                      <div className="reference-range">
                        <small className="text-muted">
                          Reference Range: {referenceRange}
                        </small>
                      </div>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            </Accordion.Body>
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  );
}

export default LabPanelsTab;
