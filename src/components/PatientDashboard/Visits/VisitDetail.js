import React from 'react';
import { Button } from 'react-bootstrap';
import { FileText, ExternalLink, ChevronRight, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosInstance';
import './VisitDetail.css';

function VisitDetail({ visit }) {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    });
  };

  const handleLabReportClick = (reportId) => {
    navigate(`/patient-dashboard/medical-reports/${reportId}`);
  };

  const handleDocumentClick = async (document) => {
    if (!document.content?.[0]?.attachment) return;

    const binaryId = document.content[0].attachment.replace("Binary/", "");
    try {
      const response = await axiosInstance.get(`/get-binary`, {
        params: { binary_id: binaryId },
        responseType: 'blob'
      });

      // Create blob URL and open in new window
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      
      // Cleanup blob URL after window opens
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error("Failed to fetch document content", error);
    }
  };

  return (
    <div className="visit-detail-wrapper">
      <div className="visit-detail">
        <div className="visit-header">
          <h2 className="visit-title">{visit.type}</h2>
          
          <div className="visit-meta">
            <div className="meta-item">
              <span className="meta-label">Date:</span>
              {formatDate(visit.start)}
            </div>
            <div className="meta-item">
              <span className="meta-label">Provider:</span>
              {visit.participant || 'N/A'}
            </div>
            <div className="meta-item">
              <span className="meta-label">Location:</span>
              {visit.location || 'N/A'}
            </div>
          </div>
        </div>

        {visit.encounter_summary && (
          <section className="visit-section">
            <h3>Visit Summary</h3>
            <div className="content-card">
              <p>{visit.encounter_summary}</p>
            </div>
          </section>
        )}

        {visit.reports && visit.reports.length > 0 && (
          <section className="visit-section">
            <h3>Lab Reports</h3>
            <div className="grid-list">
              {visit.reports.map((report) => (
                <button
                  key={report.id}
                  className="list-item"
                  onClick={() => handleLabReportClick(report.id)}
                >
                  <Activity className="item-icon" />
                  <span className="item-text">{report.report_name}</span>
                  <ChevronRight className="item-arrow" />
                </button>
              ))}
            </div>
          </section>
        )}

        {visit.documents && visit.documents.length > 0 && (
          <section className="visit-section">
            <h3>Documents</h3>
            <div className="grid-list">
              {visit.documents.map((doc, index) => (
                <button
                  key={index}
                  className="list-item"
                  onClick={() => handleDocumentClick(doc)}
                >
                  <FileText className="item-icon" />
                  <span className="item-text">
                    {doc.type} ({doc.category})
                  </span>
                  <ExternalLink className="item-arrow" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default VisitDetail;
