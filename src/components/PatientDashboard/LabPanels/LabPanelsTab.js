import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Form, InputGroup, Accordion, ListGroup, Badge, Card, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Search, Heart, Activity, Zap, Droplets, Coffee, Salad, X, AlertTriangle, Sun, Bookmark } from 'lucide-react';
import EmptyStateMessage from '../../Common/EmptyStateMessage';
import { ConnectionProvider } from '../../../context/ConnectionContext';
import '../../Common/EmptyStateMessage.css';
import './LabPanelsTab.css';

function LabPanelsTab({ standardPanels }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPanels, setFilteredPanels] = useState([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const contentRef = useRef(null);
  const [expandedPanels, setExpandedPanels] = useState({});

  // Map panel names to icons
  const getPanelIcon = (panelName) => {
    const panelNameLower = panelName.toLowerCase();
    
    if (panelNameLower.includes('metabolic') || panelNameLower.includes('chemistry')) {
      return <FlaskConical size={24} color="#667EEA" />;
    } else if (panelNameLower.includes('blood') || panelNameLower.includes('hematology') || panelNameLower.includes('cbc')) {
      return <Droplets size={24} color="#F56565" />;
    } else if (panelNameLower.includes('heart') || panelNameLower.includes('cardiac') || panelNameLower.includes('cardio')) {
      return <Heart size={24} color="#F56565" />;
    } else if (panelNameLower.includes('electrolyte')) {
      return <Zap size={24} color="#ECC94B" />;
    } else if (panelNameLower.includes('urine') || panelNameLower.includes('urinalysis')) {
      return <Droplets size={24} color="#4299E1" />;
    } else if (panelNameLower.includes('thyroid')) {
      return <Sun size={24} color="#9F7AEA" />;
    } else if (panelNameLower.includes('vitamin') || panelNameLower.includes('nutrient')) {
      return <Salad size={24} color="#48BB78" />;
    } else if (panelNameLower.includes('liver') || panelNameLower.includes('hepatic')) {
      return <Bookmark size={24} color="#ED8936" />;
    } else if (panelNameLower.includes('kidney') || panelNameLower.includes('renal')) {
      return <Droplets size={24} color="#3182CE" />;
    } else if (panelNameLower.includes('glucose') || panelNameLower.includes('sugar') || panelNameLower.includes('diabetes')) {
      return <Activity size={24} color="#DD6B20" />;
    } else if (panelNameLower.includes('hormone') || panelNameLower.includes('endocrin')) {
      return <Activity size={24} color="#D53F8C" />;
    } else if (panelNameLower.includes('lipid') || panelNameLower.includes('cholesterol')) {
      return <Activity size={24} color="#805AD5" />;
    } else {
      return <FlaskConical size={24} color="#667EEA" />;
    }
  };

  // Define getLatestObservation before it's used in calculateTestCounts
  const getLatestObservation = (values) => {
    if (!values || values.length === 0) return null;
    return values.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  };

  // Calculate normal and abnormal test counts for each panel
  const calculateTestCounts = (panel) => {
    let normalCount = 0;
    let abnormalCount = 0;
    let noResultCount = 0;

    panel.observations.forEach(observation => {
      const latestObs = getLatestObservation(observation.values);
      if (latestObs) {
        if (latestObs.is_normal === false) {
          abnormalCount++;
        } else if (latestObs.is_normal === true) {
          normalCount++;
        } else {
          // For cases where is_normal is undefined/null but we have a value
          normalCount++;
        }
      } else {
        // No result available
        noResultCount++;
      }
    });

    return { 
      normalCount, 
      abnormalCount, 
      noResultCount,
      totalCount: panel.observations.length 
    };
  };

  // Calculate total normal and abnormal tests across all panels
  const totalCounts = useMemo(() => {
    if (!filteredPanels || filteredPanels.length === 0) return { totalNormal: 0, totalAbnormal: 0 };

    let totalNormal = 0;
    let totalAbnormal = 0;

    filteredPanels.forEach(panel => {
      const { normalCount, abnormalCount } = calculateTestCounts(panel);
      totalNormal += normalCount;
      totalAbnormal += abnormalCount;
    });

    return { totalNormal, totalAbnormal };
  }, [filteredPanels]);

  // Memoized calculation of maximum counts across all panels for consistent scaling
  const maxCounts = useMemo(() => {
    if (!filteredPanels || filteredPanels.length === 0) return { maxNormal: 0, maxAbnormal: 0, maxTotal: 0 };

    let maxNormal = 0;
    let maxAbnormal = 0;
    let maxTotal = 0;

    filteredPanels.forEach(panel => {
      const { normalCount, abnormalCount } = calculateTestCounts(panel);
      const total = normalCount + abnormalCount;

      if (normalCount > maxNormal) maxNormal = normalCount;
      if (abnormalCount > maxAbnormal) maxAbnormal = abnormalCount;
      if (total > maxTotal) maxTotal = total;
    });

    return { maxNormal, maxAbnormal, maxTotal };
  }, [filteredPanels]);

  // Function to calculate bar widths based on container width and counts
  const calculateBarWidth = (count, total) => {
    if (!count || count === 0) return 0;
    
    // Use a fixed maximum width for the bars
    const maxBarWidth = 100;
    
    // Calculate the relative width compared to the total
    const relativeWidth = (count / total) * maxBarWidth;
    
    // Apply a minimum width (12px) to ensure very small counts are still visible
    return Math.max(12, relativeWidth);
  };

  // For the summary KPI cards, use a fixed width calculation
  const calculateSummaryBarWidth = (count, total) => {
    if (!count || count === 0 || !total || total === 0) return 0;
    
    // Use 80% of the card width for the bar
    const barWidthPercentage = (count / total) * 100;
    
    // Cap the percentage at 100%
    return Math.min(80, barWidthPercentage);
  };

  // Use effect to measure the available width
  useEffect(() => {
    if (contentRef.current) {
      const updateWidth = () => {
        const newWidth = contentRef.current.getBoundingClientRect().width;
        setContainerWidth(newWidth);
      };
      
      // Initial measurement
      updateWidth();
      
      // Update on resize
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, []);

  useEffect(() => {
    if (!standardPanels) return;
    
    if (!searchTerm.trim()) {
      setFilteredPanels(standardPanels);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    
    // Filter panels that match the search term or have matching observations
    const panels = standardPanels.map(panel => {
      const isPanelMatch = 
        panel.name.toLowerCase().includes(term) || 
        panel.long_name?.toLowerCase().includes(term);
      
      // Filter observations within each panel
      const matchingObservations = panel.observations.filter(obs => 
        obs.name.toLowerCase().includes(term) || 
        obs.long_name.toLowerCase().includes(term)
      );
      
      // Return the panel with only matching observations if there are any matches
      if (isPanelMatch || matchingObservations.length > 0) {
        return isPanelMatch 
          ? panel 
          : { ...panel, observations: matchingObservations };
      }
      
      return null;
    }).filter(Boolean);
    
    setFilteredPanels(panels);
    
    // Auto-expand panels with matches when searching
    if (term) {
      const newExpandedState = {};
      panels.forEach(panel => {
        newExpandedState[panel.name] = true;
      });
      setExpandedPanels(newExpandedState);
    }
  }, [searchTerm, standardPanels]);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
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

  const togglePanel = (panelName) => {
    setExpandedPanels(prev => ({
      ...prev,
      [panelName]: !prev[panelName]
    }));
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

  // Get total normal and abnormal counts
  const { totalNormal, totalAbnormal } = totalCounts;
  const totalTests = totalNormal + totalAbnormal;

  return (
    <div className="lp-page-container">
      {hasLabPanels ? (
        <>
          <div className="lp-summary-section">
            <h2 className="lp-summary-title">Lab Test Summary</h2>
            <Row className="lp-summary-cards g-2">
              <Col xs={6} className="mb-2">
                <Card className="lp-summary-card">
                  <Card.Body className="d-flex align-items-center justify-content-between">
                    <div>
                      <h3 className="lp-card-value text-success">{totalNormal}</h3>
                      <p className="lp-card-label">Normal</p>
                    </div>
                    <div className="lp-card-icon text-success">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={6} className="mb-2">
                <Card className="lp-summary-card">
                  <Card.Body className="d-flex align-items-center justify-content-between">
                    <div>
                      <h3 className="lp-card-value text-warning">{totalAbnormal}</h3>
                      <p className="lp-card-label">Flagged</p>
                    </div>
                    <div className="lp-card-icon text-warning">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>

          <div className="lp-search-container">
            <InputGroup>
              <Form.Control
                placeholder="Search lab panels and tests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="lp-search-input"
              />
              <div className="lp-search-icon">
                <Search size={16} color="#718096" />
              </div>
              {searchTerm && (
                <div className="lp-search-clear" onClick={clearSearch}>
                  <X size={16} />
                </div>
              )}
            </InputGroup>
          </div>
          
          <div className="lp-panels-container" ref={contentRef}>
            {filteredPanels.length > 0 ? (
              <Accordion className="lp-panel-list">
                {filteredPanels.map((panel, index) => {
                  const { normalCount, abnormalCount, totalCount } = calculateTestCounts(panel);
                  const panelTotal = normalCount + abnormalCount;
                  const normalBarWidth = calculateBarWidth(normalCount, panelTotal);
                  const abnormalBarWidth = calculateBarWidth(abnormalCount, panelTotal);
                  const isPanelExpanded = expandedPanels[panel.name];
                  
                  return (
                    <div key={panel.name} className="lp-panel-wrapper">
                      <div 
                        className="lp-panel-item"
                        onClick={() => togglePanel(panel.name)}
                      >
                        <div className="lp-panel-icon">
                          {getPanelIcon(panel.name)}
                        </div>
                        
                        <div className="lp-panel-content">
                          <div className="lp-panel-header">
                            <h5 className="lp-panel-title">{panel.name}</h5>
                            <span className="lp-panel-badge">
                              {panel.observations.length} {panel.observations.length === 1 ? 'test' : 'tests'}
                            </span>
                          </div>
                          
                          <div className="lp-panel-indicators">
                            {normalCount > 0 && (
                              <div className="lp-indicator-group">
                                <div 
                                  className="lp-indicator lp-indicator-normal"
                                  style={{ 
                                    width: `${normalBarWidth}px` 
                                  }}
                                ></div>
                                <span className="lp-indicator-count">{normalCount}</span>
                              </div>
                            )}
                            
                            {abnormalCount > 0 && (
                              <div className="lp-indicator-group">
                                <div 
                                  className="lp-indicator lp-indicator-abnormal"
                                  style={{ 
                                    width: `${abnormalBarWidth}px` 
                                  }}
                                ></div>
                                <span className="lp-indicator-count">{abnormalCount}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="lp-panel-arrow">
                          <svg 
                            width="8" 
                            height="12" 
                            viewBox="0 0 8 12" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ transform: isPanelExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                            className="lp-panel-arrow-icon"
                          >
                            <path d="M1.5 1L6.5 6L1.5 11" stroke="#A0AEC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      
                      {isPanelExpanded && (
                        <div className="lp-observation-list">
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
                                          <span className="lp-abnormal-dot" title="Out of range"></span>
                                        )}
                                      </div>
                                      {latestObs && (
                                        <div className="lp-observation-value">
                                          <span className={`lp-observation-value-number ${latestObs?.is_normal === false ? 'text-warning' : ''}`}>
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </Accordion>
            ) : (
              <div className="lp-no-results">No matching lab panels or tests found</div>
            )}
          </div>
        </>
      ) : (
        <ConnectionProvider>
          <EmptyStateMessage section="lab-panels" />
        </ConnectionProvider>
      )}
    </div>
  );
}

export default LabPanelsTab;
