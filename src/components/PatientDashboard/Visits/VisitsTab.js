import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Row, Col, Button } from 'react-bootstrap';
import { Grid, Clock } from 'lucide-react';
import VisitCard from './VisitCard';
import VisitDetail from './VisitDetail';
import './VisitsTab.css';

function VisitsTab({ encounters }) {
  const navigate = useNavigate();
  const { visitId } = useParams();
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [view, setView] = useState("grid"); // "grid" or "timeline"

  useEffect(() => {
    if (visitId && encounters) {
      const visit = encounters.find(v => v.id.toString() === visitId.toString());
      if (visit) {
        setSelectedVisit(visit);
      } else {
        navigate('/patient-dashboard/visits');
      }
    } else {
      setSelectedVisit(null);
    }
  }, [visitId, encounters, navigate]);

  const handleVisitSelect = (visit) => {
    setSelectedVisit(visit);
    navigate(`/patient-dashboard/visits/${visit.id}`);
  };

  const handleBack = () => {
    setSelectedVisit(null);
    navigate('/patient-dashboard/visits');
  };

  if (selectedVisit) {
    return (
      <VisitDetail 
        visit={selectedVisit} 
        onBack={handleBack} 
      />
    );
  }

  return (
    <div className="h-100 d-flex flex-column">
      <div className="visits-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="mb-1">Clinical Visits</h2>
            <p className="text-muted mb-0">View your clinical visit history</p>
          </div>
          <div className="d-flex gap-2">
            <Button 
              variant={view === "grid" ? "primary" : "light"}
              onClick={() => setView("grid")}
              className="d-flex align-items-center gap-2"
            >
              <Grid size={16} />
              Grid
            </Button>
            <Button 
              variant={view === "timeline" ? "primary" : "light"}
              onClick={() => setView("timeline")}
              className="d-flex align-items-center gap-2"
            >
              <Clock size={16} />
              Timeline
            </Button>
          </div>
        </div>
      </div>

      <div className="visits-grid-container">
        <Row xs={1} md={2} lg={3} className="g-4">
          {encounters
            .sort((a, b) => new Date(b.start) - new Date(a.start))
            .map((visit) => (
              <Col key={visit.id}>
                <VisitCard
                  visit={visit}
                  onClick={() => handleVisitSelect(visit)}
                />
              </Col>
            ))}
        </Row>
      </div>
    </div>
  );
}

export default VisitsTab;
