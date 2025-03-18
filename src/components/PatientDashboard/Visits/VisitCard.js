import React from 'react';
import { Card } from 'react-bootstrap';
import { Calendar, MapPin, User, FileText, Activity, Pill, FlaskConical } from 'lucide-react';
import './VisitCard.css';

function VisitCard({ visit, onClick }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    });
  };

  const handleClick = (e) => {
    e.preventDefault();
    onClick();
  };

  const documentCount = visit.documents?.length || 0;
  const reportCount = visit.reports?.length || 0;
  const medicationCount = visit.medications?.length || 0;

  return (
    <Card 
      className="visit-card h-100" 
      onClick={handleClick}
    >
      <Card.Body className="d-flex flex-column">
        <div className="card-header-row">
          <Card.Title className="card-title">{visit.type}</Card.Title>
          <div className="visit-icons">
            {documentCount > 0 && (
              <div className="visit-icon-badge" title={`${documentCount} document${documentCount !== 1 ? 's' : ''}`}>
                <FileText size={14} />
                <span className="icon-count">{documentCount}</span>
              </div>
            )}
            {reportCount > 0 && (
              <div className="visit-icon-badge" title={`${reportCount} lab report${reportCount !== 1 ? 's' : ''}`}>
                <FlaskConical size={14} />
                <span className="icon-count">{reportCount}</span>
              </div>
            )}
            {medicationCount > 0 && (
              <div className="visit-icon-badge" title={`${medicationCount} medication${medicationCount !== 1 ? 's' : ''}`}>
                <Pill size={14} />
                <span className="icon-count">{medicationCount}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-muted small d-flex flex-column gap-2 mt-auto">
          <div className="d-flex align-items-center gap-2">
            <Calendar size={16} />
            <span>{formatDate(visit.start)}</span>
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
