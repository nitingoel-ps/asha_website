import React from 'react';
import { Button } from 'react-bootstrap';
import { ArrowLeft } from 'lucide-react';
import './MedicalReportDetail.css';

function MedicalReportDetail({ report, onBack }) {
  // Extract the first part of report_type if it's comma-separated
  const reportType = report.report_type?.split(',')[0]?.trim() || 'Report';

  return (
    <div className="medical-report-detail">
      <div className="mb-4">
        <Button 
          variant="link" 
          className="back-button"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          Back to Reports
        </Button>
      </div>

      <div className="report-header mb-5">
        <span className="report-badge">{reportType}</span>
        <h2 className="report-title mt-3">{report.report_name}</h2>
        
        {report.report_summary && (
          <p className="report-summary mt-2">
            {report.report_summary}
          </p>
        )}
        
        <div className="report-meta mt-3">
          <div className="meta-item">
            <span className="meta-icon">📅</span>
            {new Date(report.report_date).toLocaleDateString()}
          </div>
          <div className="meta-item">
            <span className="meta-icon">🏢</span>
            {report.source || 'N/A'}
          </div>
          <div className="meta-item">
            <span className="meta-icon">📍</span>
            {report.report_lab || 'N/A'}
          </div>
        </div>
      </div>

      <div className="observations-grid">
        {report.observations.map((observation) => (
          <div key={observation.id} className="observation-item">
            <div className="observation-header">
              <h3 className="observation-name">{observation.name}</h3>
              {observation.is_normal !== undefined && (
                observation.is_normal ? (
                  <span className="status-badge normal">Normal</span>
                ) : (
                  <span className="status-badge warning">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 3L22 21H2L12 3Z" fill="#DC3545"/>
                      <path d="M12 17H12.01M12 7V13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </span>
                )
              )}
            </div>

            {observation.value !== null && observation.value !== undefined ? (
              <div className="observation-content">
                <div className="value-display">
                  <span className="value">{observation.value}</span>
                  {observation.uom && (
                    <span className="unit">{observation.uom}</span>
                  )}
                </div>
                {observation.ref_range && (
                  <div className="normal-range">
                    Normal range: {observation.ref_range}
                  </div>
                )}
              </div>
            ) : observation.value_str ? (
              <div className="observation-content">
                <p className="narrative-text">{observation.value_str}</p>
              </div>
            ) : null}

            {observation.explanation && (
              <p className="observation-explanation">
                {observation.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MedicalReportDetail; 