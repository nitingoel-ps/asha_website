import React, { useEffect, useMemo, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Row, Col } from 'react-bootstrap';
import VisitCard from './VisitCard';
import VisitDetail from './VisitDetail';
import './VisitsTab.css';

// Add YearHeader component
const YearHeader = React.memo(({ year }) => (
  <div className="year-header">
    <h3>{year}</h3>
  </div>
));

// Update VisitsList component
const VisitsList = React.memo(({ encounters, onVisitClick }) => {
  const groupedEncounters = useMemo(() => {
    const groups = encounters.reduce((acc, visit) => {
      const year = new Date(visit.start).getFullYear();
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(visit);
      return acc;
    }, {});

    // Sort years in descending order
    return Object.entries(groups)
      .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
      .map(([year, visits]) => ({
        year,
        visits: visits.sort((a, b) => new Date(b.start) - new Date(a.start))
      }));
  }, [encounters]);

  return (
    <div className="visits-grid-container">
      {groupedEncounters.map(({ year, visits }) => (
        <div key={year} className="year-section">
          <YearHeader year={year} />
          <Row xs={1} md={2} lg={3} className="g-4 mb-5">
            {visits.map((visit) => (
              <Col key={visit.id}>
                <VisitCard 
                  visit={visit} 
                  onClick={() => onVisitClick(visit.id)}
                />
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </div>
  );
});

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
              encounters={encounters}
              onBack={() => navigate('.')}
            />
          } 
        />
      </Routes>
    </div>
  );
}

export default React.memo(VisitsTab);
