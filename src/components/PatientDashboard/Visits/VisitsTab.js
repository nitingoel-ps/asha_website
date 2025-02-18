import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Row, Col } from 'react-bootstrap';
import VisitCard from './VisitCard';
import VisitDetail from './VisitDetail';
import './VisitsTab.css';

function VisitsTab({ encounters }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleVisitClick = (visitId) => {
    // Use relative navigation
    navigate(`${visitId}`);
  };

  // Render list view
  const VisitsList = () => (
    <div className="visits-grid-container">
      <Row xs={1} md={2} lg={3} className="g-4">
        {encounters.map((visit) => (
          <Col key={visit.id}>
            <VisitCard 
              visit={visit} 
              onClick={() => handleVisitClick(visit.id)}
            />
          </Col>
        ))}
      </Row>
    </div>
  );

  return (
    <div className="h-100 d-flex flex-column">
      <Routes>
        <Route index element={<VisitsList />} />
        <Route 
          path=":visitId" 
          element={
            <VisitDetail 
              visit={encounters.find(v => v.id === location.pathname.split('/').pop())}
              onBack={() => navigate('.')}
            />
          } 
        />
      </Routes>
    </div>
  );
}

export default VisitsTab;
