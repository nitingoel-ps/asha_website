import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Button } from 'react-bootstrap';
import { FileText, ExternalLink, ChevronRight, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosInstance';
import './VisitDetail.css';
import DocumentViewer from './DocumentViewer';

function VisitDetail({ visit }) {
  const navigate = useNavigate();
  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentBlobUrl, setDocumentBlobUrl] = useState(null);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);

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

  // Fix: Add logging and simplify document click handler
  const handleOpenDocument = async (document, index) => {
    console.log("Opening document:", document, "at index:", index);
    setCurrentDocIndex(index);
    
    if (!document || !document.content || !document.content[0] || !document.content[0].attachment) {
      console.error("Invalid document structure:", document);
      return;
    }

    const binaryId = document.content[0].attachment.replace("Binary/", "");
    console.log("Fetching binary content for ID:", binaryId);

    try {
      const response = await axiosInstance.get(`/get-binary`, {
        params: { binary_id: binaryId },
        responseType: 'blob'
      });
      
      console.log("Binary response received:", response.headers['content-type']);
      
      // Create blob URL
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const blobUrl = URL.createObjectURL(blob);
      
      // Determine document type from content type
      let documentType = "auto";
      const contentType = response.headers['content-type'];
      if (contentType) {
        if (contentType.includes('pdf')) {
          documentType = "pdf";
        } else if (contentType.includes('html')) {
          documentType = "html";
        } else if (contentType.includes('text')) {
          documentType = "text";
        }
      }
      
      setDocumentBlobUrl(blobUrl);
      setViewingDocument({
        id: document.id,
        name: document.name || document.type,
        type: documentType
      });
    } catch (error) {
      console.error("Failed to fetch document content", error);
      alert("Failed to load document. Please try again.");
    }
  };

  const navigateDocument = async (direction) => {
    if (!visit.documents || visit.documents.length === 0) return;
    
    const newIndex = direction === 'next' 
      ? (currentDocIndex + 1) % visit.documents.length
      : (currentDocIndex - 1 + visit.documents.length) % visit.documents.length;
    
    console.log(`Navigating ${direction} to document index ${newIndex}`);
    await handleOpenDocument(visit.documents[newIndex], newIndex);
  };

  const handleCloseDocument = () => {
    console.log("Document viewer closing");
    if (documentBlobUrl) {
      URL.revokeObjectURL(documentBlobUrl);
      setDocumentBlobUrl(null);
    }
    setViewingDocument(null);
  };

  useEffect(() => {
    return () => {
      if (documentBlobUrl) {
        URL.revokeObjectURL(documentBlobUrl);
      }
    };
  }, [documentBlobUrl]);

  // Log visit object to debug
  useEffect(() => {
    console.log("Visit data:", visit);
    if (visit && visit.documents) {
      console.log("Documents:", visit.documents);
    }
  }, [visit]);

  // Use Portal to render the document viewer outside the current DOM hierarchy
  const renderDocumentViewer = () => {
    if (!viewingDocument || !documentBlobUrl || !visit.documents) return null;
    
    return ReactDOM.createPortal(
      <DocumentViewer
        documentUrl={documentBlobUrl}
        documentName={viewingDocument.name}
        documentType={viewingDocument.type || "auto"}
        onClose={handleCloseDocument}
        onPrevDocument={() => navigateDocument('prev')}
        onNextDocument={() => navigateDocument('next')}
        hasPrev={visit.documents.length > 1}
        hasNext={visit.documents.length > 1}
        documentIndex={currentDocIndex}
        totalDocuments={visit.documents.length}
      />,
      document.body
    );
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
                  onClick={() => handleOpenDocument(doc, index)} // Pass the index
                >
                  <FileText className="item-icon" />
                  <span className="item-text">
                    {doc.type} {doc.category ? `(${doc.category})` : ''}
                  </span>
                  <ExternalLink className="item-arrow" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Render document viewer with ReactDOM.createPortal */}
        {renderDocumentViewer()}
      </div>
    </div>
  );
}

export default VisitDetail;
