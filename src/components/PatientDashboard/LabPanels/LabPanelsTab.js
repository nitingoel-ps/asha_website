import React, { useState, useEffect } from 'react';
import { Card, ListGroup, Badge, Accordion, Form, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Search } from 'lucide-react';
import EmptyStateMessage from '../../Common/EmptyStateMessage';
import { ConnectionProvider } from '../../../context/ConnectionContext';
import '../../Common/EmptyStateMessage.css';
import './LabPanelsTab.css';

function LabPanelsTab({ standardPanels }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPanels, setFilteredPanels] = useState([]);
  const [activeKeys, setActiveKeys] = useState([]);

  useEffect(() => {
    if (!standardPanels) return;
    
    if (!searchTerm.trim()) {
      setFilteredPanels(standardPanels);
      setActiveKeys([]);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const newActiveKeys = [];
    
    // Filter panels that match the search term or have matching observations
    const panels = standardPanels.map(panel => {
      const isPanelMatch = 
        panel.name.toLowerCase().includes(term) || 
        panel.long_name.toLowerCase().includes(term);
      
      // Filter observations within each panel
      const matchingObservations = panel.observations.filter(obs => 
        obs.name.toLowerCase().includes(term) || 
        obs.long_name.toLowerCase().includes(term)
      );
      
      // Return the panel with only matching observations if there are any matches
      if (isPanelMatch || matchingObservations.length > 0) {
        // Add this panel to active keys to ensure it's expanded
        newActiveKeys.push(panel.name);
        
        return isPanelMatch 
          ? panel 
          : { ...panel, observations: matchingObservations };
      }
      
      return null;
    }).filter(Boolean);
    
    setFilteredPanels(panels);
    setActiveKeys(newActiveKeys);
  }, [searchTerm, standardPanels]);

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

  const clearSearch = () => {
    setSearchTerm('');
  };

  // Check if we have lab panels data
  const hasLabPanels = standardPanels && standardPanels.length > 0;

  // If no data, return empty state handler
  if (!hasLabPanels) {
    return (
      <ConnectionProvider>
        <EmptyStateMessage section="lab-panels" />
      </ConnectionProvider>
    );
  }

  return (
    <div className="lp-panels-container">
      <div className="lp-search-container mb-4">
        <InputGroup>
          <InputGroup.Text className="lp-search-icon">
            <Search size={18} />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search lab panels and tests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="lp-search-input"
          />
          {searchTerm && (
            <InputGroup.Text 
              className="lp-search-clear" 
              onClick={clearSearch}
            >
              ✕
            </InputGroup.Text>
          )}
        </InputGroup>
      </div>
      
      {filteredPanels.length === 0 ? (
        <div className="lp-no-results">No matching lab panels or tests found</div>
      ) : (
        <Accordion activeKey={searchTerm ? activeKeys : undefined}>
          {filteredPanels.map((panel, index) => (
            <Accordion.Item 
              key={panel.name} 
              eventKey={panel.name} 
              className="lp-panel-card mb-4"
            >
              <Accordion.Header>
                <div className="d-flex align-items-center w-100">
                  <FlaskConical size={24} className="me-2" color="#667EEA" />
                  <div className="lp-panel-header-content">
                    <h5 className="mb-0">{panel.name}</h5>
                  </div>
                  <Badge bg="primary" className="ms-auto lp-observation-count">
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
                        className="lp-observation-item"
                      >
                        <div className="d-flex flex-column">
                          <div className="lp-observation-header">
                            <div className="lp-observation-title">
                              {observation.name}
                              {latestObs?.is_normal === false && (
                                <Badge bg="warning">Out of range</Badge>
                              )}
                            </div>
                            {latestObs && (
                              <div className="lp-observation-value">
                                <span className="lp-observation-value-number">
                                  {latestObs.observation_value}
                                </span>
                                <span className="lp-observation-value-unit">
                                  {' '}{observation.uom}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="lp-observation-subtitle">
                            {observation.long_name}
                          </div>
                          {latestObs && (
                            <div className="lp-observation-date">
                              {formatDate(latestObs.date)}
                            </div>
                          )}
                          <div className="lp-reference-range">
                            <small className="text-muted">
                              Reference Range: {referenceRange}
                            </small>
                          </div>
                        </div>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </div>
  );
}

export default LabPanelsTab;
