import React, { useState, useMemo, useEffect } from 'react';
import { Card, Badge, Tabs, Tab, Container, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import './HealthPriorities.css';

const FocusAreaCard = ({ focusArea, onClick }) => {
  const getBadgeVariant = (status) => {
    switch (status.toLowerCase()) {
      case 'active': return 'success';
      case 'suggested': return 'warning';
      case 'completed': return 'secondary';
      case 'dismissed': return 'danger';
      default: return 'info';
    }
  };

  return (
    <Card className="focus-area-card mb-3" onClick={onClick}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Card.Title>{focusArea.title}</Card.Title>
          <Badge bg={getBadgeVariant(focusArea.status)}>
            {focusArea.status}
          </Badge>
        </div>
        <Card.Text className="focus-area-description">
          {focusArea.short_description}
        </Card.Text>
      </Card.Body>
    </Card>
  );
};

const HealthPrioritiesTab = ({ focusAreas = [] }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('review'); // Changed default to 'review'
  
  const handleFocusAreaClick = (id) => {
    navigate(`/patient-dashboard/health-priorities/${id}`);
  };

  const groupedFocusAreas = useMemo(() => {
    const sortByImportance = (a, b) => b.importance_score - a.importance_score;
    
    return {
      review: focusAreas
        .filter(area => area.status.toLowerCase() === 'suggested')
        .sort(sortByImportance),
        
      active: focusAreas
        .filter(area => area.status.toLowerCase() === 'active')
        .sort(sortByImportance),
      
      inactive: focusAreas
        .filter(area => ['completed', 'dismissed'].includes(area.status.toLowerCase()))
        .sort(sortByImportance),
    };
  }, [focusAreas]);

  // Use effect to set the initial tab based on available data
  useEffect(() => {
    if (groupedFocusAreas.review.length > 0) {
      setActiveTab('review');
    } else if (groupedFocusAreas.active.length > 0) {
      setActiveTab('active');
    } else if (groupedFocusAreas.inactive.length > 0) {
      setActiveTab('inactive');
    }
  }, [groupedFocusAreas]);

  return (
    <Container className="health-priorities-container">
      <h2 className="mb-4">Health Priorities</h2>
      
      {focusAreas.length === 0 ? (
        <Alert variant="info">
          No health priorities have been identified yet.
        </Alert>
      ) : (
        <Tabs
          activeKey={activeTab}
          onSelect={(key) => setActiveTab(key)}
          className="mb-4"
        >
          <Tab 
            eventKey="review" 
            title={`Review (${groupedFocusAreas.review.length})`}
          >
            <Row xs={1} md={2} lg={3} className="g-4">
              {groupedFocusAreas.review.map((focusArea) => (
                <Col key={focusArea.id}>
                  <FocusAreaCard 
                    focusArea={focusArea}
                    onClick={() => handleFocusAreaClick(focusArea.id)}
                  />
                </Col>
              ))}
            </Row>
            {groupedFocusAreas.review.length === 0 && (
              <Alert variant="light" className="text-center mt-3">
                No priorities to review
              </Alert>
            )}
          </Tab>
          
          <Tab 
            eventKey="active" 
            title={`Active (${groupedFocusAreas.active.length})`}
          >
            <Row xs={1} md={2} lg={3} className="g-4">
              {groupedFocusAreas.active.map((focusArea) => (
                <Col key={focusArea.id}>
                  <FocusAreaCard 
                    focusArea={focusArea}
                    onClick={() => handleFocusAreaClick(focusArea.id)}
                  />
                </Col>
              ))}
            </Row>
            {groupedFocusAreas.active.length === 0 && (
              <Alert variant="light" className="text-center mt-3">
                No active health priorities
              </Alert>
            )}
          </Tab>
          
          <Tab 
            eventKey="inactive" 
            title={`Inactive (${groupedFocusAreas.inactive.length})`}
          >
            <Row xs={1} md={2} lg={3} className="g-4">
              {groupedFocusAreas.inactive.map((focusArea) => (
                <Col key={focusArea.id}>
                  <FocusAreaCard 
                    focusArea={focusArea}
                    onClick={() => handleFocusAreaClick(focusArea.id)}
                  />
                </Col>
              ))}
            </Row>
            {groupedFocusAreas.inactive.length === 0 && (
              <Alert variant="light" className="text-center mt-3">
                No inactive health priorities
              </Alert>
            )}
          </Tab>
        </Tabs>
      )}
    </Container>
  );
};

export default HealthPrioritiesTab;
