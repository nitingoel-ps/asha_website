import React from 'react';
import { Card } from 'react-bootstrap';
import { Calendar, MapPin, Database } from 'lucide-react';
import './MedicalReportCard.css';

function MedicalReportCard({ report, onClick }) {
  // Extract the first part of report_type if it's comma-separated
  const reportType = report.report_type?.split(',')[0]?.trim() || 'Report';

  return (
    <Card 
      className="medical-report-card h-100" 
      onClick={onClick}
    >
      <Card.Body className="d-flex flex-column">
        <div className="card-header-row">
          <Card.Title className="card-title">{report.report_name}</Card.Title>
          <span className="report-badge">{reportType}</span>
        </div>
        
        <div className="text-muted small d-flex flex-column gap-2 mt-auto">
          <div className="d-flex align-items-center gap-2">
            <Calendar size={16} />
            <span>{new Date(report.report_date).toLocaleDateString()}</span>
          </div>
          
          <div className="d-flex align-items-center gap-2">
            <Database size={16} />
            <span>{report.source || 'N/A'}</span>
          </div>
          
          <div className="d-flex align-items-center gap-2">
            <MapPin size={16} />
            <span>{report.report_lab || 'N/A'}</span>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

export default MedicalReportCard; 