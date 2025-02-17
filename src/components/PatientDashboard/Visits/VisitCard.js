import React from 'react';
import { Card } from 'react-bootstrap';
import { Calendar, MapPin, User } from 'lucide-react';
import './VisitCard.css';

function VisitCard({ visit, onClick }) {
  return (
    <Card 
      className="visit-card h-100" 
      onClick={onClick}
    >
      <Card.Body className="d-flex flex-column">
        <div className="card-header-row">
          <Card.Title className="card-title">{visit.type}</Card.Title>
          <span className="visit-badge">Visit</span>
        </div>
        
        <div className="text-muted small d-flex flex-column gap-2 mt-auto">
          <div className="d-flex align-items-center gap-2">
            <Calendar size={16} />
            <span>{new Date(visit.start).toLocaleDateString()}</span>
          </div>
          
          <div className="d-flex align-items-center gap-2">
            <User size={16} />
            <span>{visit.participant || 'N/A'}</span>
          </div>
          
          <div className="d-flex align-items-center gap-2">
            <MapPin size={16} />
            <span>{visit.location || 'N/A'}</span>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

export default VisitCard;
