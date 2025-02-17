import React, { useState } from 'react';
import { Button, Nav, Tab } from 'react-bootstrap';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosInstance';
import './VisitDetail.css';

function VisitDetail({ visit, onBack }) {
  const [activeDocumentTab, setActiveDocumentTab] = useState(0);
  const [documentContents, setDocumentContents] = useState({});
  const navigate = useNavigate();

  const handleLabReportClick = (reportId) => {
    navigate(`/patient-dashboard/medical-reports/${reportId}`);
  };

  const loadDocumentContent = async (attachment, index) => {
    if (documentContents[index]) return;

    const binaryId = attachment.replace("Binary/", "");
    try {
      const response = await axiosInstance.get(`/get-binary`, {
        params: { binary_id: binaryId }
      });
      setDocumentContents(prev => ({
        ...prev,
        [index]: {
          content: response.data,
          contentType: response.headers['content-type']
        }
      }));
    } catch (error) {
      console.error("Failed to fetch document content", error);
    }
  };

  return (
    <div className="visit-detail">

      <div className="visit-header mb-5">
        <h2 className="visit-title mt-3">{visit.type}</h2>
        
        <div className="visit-meta mt-3">
          <div className="meta-item">
            <span className="meta-icon">📅</span>
            {new Date(visit.start).toLocaleDateString()}
          </div>
          <div className="meta-item">
            <span className="meta-icon">👤</span>
            {visit.participant || 'N/A'}
          </div>
          <div className="meta-item">
            <span className="meta-icon">📍</span>
            {visit.location || 'N/A'}
          </div>
        </div>
      </div>

      {visit.encounter_summary && (
        <div className="visit-summary mb-4">
          <h3>Visit Summary</h3>
          <p>{visit.encounter_summary}</p>
        </div>
      )}

      {visit.reports && visit.reports.length > 0 && (
        <div className="visit-reports mb-4">
          <h3>Lab Reports</h3>
          <div className="report-links">
            {visit.reports.map((report) => (
              <Button
                key={report.id}
                variant="link"
                onClick={() => handleLabReportClick(report.id)}
                className="report-link"
              >
                {report.report_name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {visit.documents && visit.documents.length > 0 && (
        <div className="visit-documents">
          <h3>Documents</h3>
          <Tab.Container 
            activeKey={activeDocumentTab}
            onSelect={(k) => {
              setActiveDocumentTab(k);
              const doc = visit.documents[k];
              loadDocumentContent(doc.content[0]?.attachment, k);
            }}
          >
            <Nav variant="tabs" className="mb-3">
              {visit.documents.map((doc, index) => (
                <Nav.Item key={index}>
                  <Nav.Link eventKey={index}>
                    {doc.type} ({doc.category})
                  </Nav.Link>
                </Nav.Item>
              ))}
            </Nav>
            <Tab.Content>
              {visit.documents.map((doc, index) => (
                <Tab.Pane key={index} eventKey={index}>
                  {documentContents[index] ? (
                    documentContents[index].contentType === "text/html" ? (
                      <div dangerouslySetInnerHTML={{ __html: documentContents[index].content }} />
                    ) : (
                      <pre>{documentContents[index].content}</pre>
                    )
                  ) : (
                    <div>Loading document...</div>
                  )}
                </Tab.Pane>
              ))}
            </Tab.Content>
          </Tab.Container>
        </div>
      )}
    </div>
  );
}

export default VisitDetail;
