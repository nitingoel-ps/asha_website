import React from 'react';
import { Button } from 'react-bootstrap';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './MedicalReportDetail.css';

function MedicalReportDetail({ report, onBack }) {
  const navigate = useNavigate();
  
  const handleTrendClick = (stdId, event) => {
    event.stopPropagation();
    navigate(`/patient-dashboard/observation/${stdId}`);
  };

  // Extract the first part of report_type if it's comma-separated
  const reportType = report.report_type?.split(',')[0]?.trim() || 'Report';

  return (
    <div className="mr-medical-report-detail">

      <div className="mr-report-header mb-5">
        <h2 className="mr-report-title mt-3">{report.report_name}</h2>
        <span className="mr-report-badge">{reportType}</span>
        
        {report.report_summary && (
          <p className="mr-report-summary mt-2">
            {report.report_summary}
          </p>
        )}
        
        <div className="mr-report-meta mt-3">
          <div className="mr-meta-item">
            <span className="mr-meta-icon">📅</span>
            {new Date(report.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="mr-meta-item">
            <span className="mr-meta-icon">🏢</span>
            {report.source || 'N/A'}
          </div>
          <div className="mr-meta-item">
            <span className="mr-meta-icon">📍</span>
            {report.report_lab || 'N/A'}
          </div>
        </div>
      </div>

      <div className="mr-observations-grid">
        {report.observations.map((observation) => (
          <div key={observation.id} className="mr-observation-item">
            <div className="mr-observation-header">
              <h3 className="mr-observation-name">{observation.name}</h3>
              <div className="mr-observation-indicators">
                {observation.is_normal !== null && (
                  observation.is_normal ? (
                    <span className="mr-status-badge mr-normal">Normal</span>
                  ) : (
                    <span className="mr-status-icon mr-warning">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 3L22 21H2L12 3Z" fill="#DC3545"/>
                        <path d="M12 17H12.01M12 7V13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </span>
                  )
                )}
                {observation.std_id && (
                  <div className="mr-trends-icon-container">
                    <TrendingUp
                      size={20}
                      className="mr-trends-icon"
                      onClick={(e) => handleTrendClick(observation.std_id, e)}
                    />
                  </div>
                )}
              </div>
            </div>

            {observation.value !== null && observation.value !== undefined ? (
              <div className="mr-observation-content">
                <div className="mr-value-display">
                  <span className="mr-value">{observation.value}</span>
                  {observation.uom && (
                    <span className="mr-unit">{observation.uom}</span>
                  )}
                </div>
                {observation.ref_range && (
                  <div className="mr-normal-range">
                    Normal range: {observation.ref_range}
                  </div>
                )}
              </div>
            ) : observation.value_str ? (
              <div className="mr-observation-content">
                <p className="mr-narrative-text">{observation.value_str}</p>
              </div>
            ) : null}

            {observation.explanation && (
              <p className="mr-observation-explanation">
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