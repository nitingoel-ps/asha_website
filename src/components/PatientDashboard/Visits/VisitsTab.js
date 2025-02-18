import React, { useEffect, useMemo, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Row, Col } from 'react-bootstrap';
import VisitCard from './VisitCard';
import VisitDetail from './VisitDetail';
import './VisitsTab.css';

// Separate VisitsList into its own component
const VisitsList = React.memo(({ encounters, onVisitClick }) => (
  <div className="visits-grid-container">
    <h2 className="mb-4">Clinical Visits</h2>
    <Row xs={1} md={2} lg={3} className="g-4">
      {encounters.map((visit) => (
        <Col key={visit.id}>
          <VisitCard 
            visit={visit} 
            onClick={() => onVisitClick(visit.id)}
          />
        </Col>
      ))}
    </Row>
  </div>
));

function VisitsTab({ encounters }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleVisitClick = useCallback((visitId) => {
    navigate(`${visitId}`);
  }, [navigate]);

  useEffect(() => {
    console.log("VisitsTab mounted");
    return () => {
      console.log("VisitsTab unmounted");
    };
  }, []);

  const currentVisit = useMemo(() => {
    const visitId = location.pathname.split('/').pop();
    return encounters.find(v => v.id === visitId);
  }, [encounters, location.pathname]);

  return (
    <div className="h-100 d-flex flex-column">
      <Routes>
        <Route 
          index 
          element={
            <VisitsList 
              encounters={encounters} 
              onVisitClick={handleVisitClick}
            />
          } 
        />
        <Route 
          path=":visitId" 
          element={
            <VisitDetail 
              visit={currentVisit}
              onBack={() => navigate('.')}
            />
          } 
        />
      </Routes>
    </div>
  );
}

export default React.memo(VisitsTab);
