import React, { useState, useMemo, useEffect } from 'react';
import { Card, Badge, Tabs, Tab, Container, Row, Col, Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import './HealthPriorities.css';
import axiosInstance from '../../utils/axiosInstance';

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

  const handleAcceptClick = (e) => {
    e.stopPropagation(); // Prevent card click
    console.log('Accept button clicked for focus area:', focusArea.id);
    // Add implementation for accepting a focus area
  };

  const handleRejectClick = (e) => {
    e.stopPropagation(); // Prevent card click
    console.log('Reject button clicked for focus area:', focusArea.id);
    // Add implementation for rejecting a focus area
  };

  // Truncate longer descriptions to maintain consistent card height
  const truncateDescription = (text, maxLength = 120) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  const truncatedDescription = truncateDescription(focusArea.short_description);

  return (
    <Card className="focus-area-card" onClick={onClick}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Card.Title>{focusArea.title}</Card.Title>
          <Badge bg={getBadgeVariant(focusArea.status)}>
            {focusArea.status}
          </Badge>
        </div>
        <Card.Text className="focus-area-description">
          {truncatedDescription}
        </Card.Text>
        <div className="action-buttons-container">
          <span className="action-buttons-label">Actions:</span>
          <div className="action-buttons">
            <Button 
              variant="link"
              size="sm"
              className="action-button"
              onClick={handleAcceptClick}
              title="Accept this health priority"
            >
              <ThumbsUp size={20} />
            </Button>
            <Button 
              variant="link"
              size="sm"
              className="action-button"
              onClick={handleRejectClick}
              title="Reject this health priority"
            >
              <ThumbsDown size={20} />
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

function HealthPriorities() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('review');
  const [focusAreas, setFocusAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchFocusAreas = async () => {
      try {
        const response = await axiosInstance.get('/patient-dashboard/');
        setFocusAreas(response.data?.focus_areas || []);
        setLoading(false);
      } catch (err) {
        setError('Failed to load health priorities. Please try again later.');
        console.error('Error fetching health priorities:', err);
        setFocusAreas([]);
        setLoading(false);
      }
    };

    fetchFocusAreas();
  }, []);
  
  const handleFocusAreaClick = (id) => {
    navigate(`/health-priorities/${id}`);
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

  // Add useEffect to ensure proper scrolling
  useEffect(() => {
    // Ensure the container takes up full height
    const container = document.querySelector('.health-priorities-container');
    if (container) {
      // Force a reflow to ensure proper layout
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      
      // Make sure content doesn't get cut off at the bottom
      const handleResize = () => {
        // Add a little delay to let the DOM update
        setTimeout(() => {
          window.scrollTo(0, 0);
        }, 100);
      };
      
      handleResize();
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [activeTab, groupedFocusAreas]);

  if (loading) {
    return (
      <Container className="health-priorities-container">
        <h2 className="mb-4">Health Priorities</h2>
        <div className="loading-insights">
          <div className="loading-spinner"></div>
          <p>Loading health priorities...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="health-priorities-container">
        <h2 className="mb-4">Health Priorities</h2>
        <Alert variant="danger">
          {error}
        </Alert>
      </Container>
    );
  }

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
      <div className="scroll-spacer" style={{ height: '60px', width: '100%' }}></div>
    </Container>
  );
}

export default HealthPriorities; 