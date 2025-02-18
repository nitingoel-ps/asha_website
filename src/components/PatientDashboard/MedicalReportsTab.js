import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Card, Container, Button, Row, Col } from 'react-bootstrap';
import { Grid, Clock } from 'lucide-react';
import MedicalReportCard from './MedicalReports/MedicalReportCard';
import MedicalReportDetail from './MedicalReports/MedicalReportDetail';
import './MedicalReportsTab.css';

function MedicalReportsTab({ diagnosticReports }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState("grid"); // "grid" or "timeline"

  // Group reports by year and month for timeline view
  const groupReportsByDate = (reports) => {
    return reports.reduce((acc, report) => {
      const date = new Date(report.report_date);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      if (!acc[year]) {
        acc[year] = {};
      }
      if (!acc[year][month]) {
        acc[year][month] = [];
      }
      acc[year][month].push(report);
      return acc;
    }, {});
  };

  const groupedReports = groupReportsByDate(diagnosticReports.list);

  const handleReportSelect = (report) => {
    navigate(`${report.id}`);
  };

  const handleBack = () => {
    navigate('..');
  };

  // Separate component for the reports list view
  const ReportsList = () => (
    <div className="h-100 d-flex flex-column">
      <div className="reports-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="mb-1">Medical Reports</h2>
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

      {view === "grid" ? (
        <div className="grid-container">
          <Row xs={1} md={2} lg={3} className="g-4">
            {diagnosticReports.list.map((report) => (
              <Col key={report.id}>
                <MedicalReportCard
                  report={report}
                  onClick={() => handleReportSelect(report)}
                />
              </Col>
            ))}
          </Row>
        </div>
      ) : (
        <div className="timeline-container">
          {Object.entries(groupedReports)
            .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
            .map(([year, months]) => (
              <div key={year} className="timeline-year">
                <h3 className="timeline-year-header">{year}</h3>
                {Object.entries(months)
                  .sort(([monthA], [monthB]) => Number(monthB) - Number(monthA))
                  .map(([month, reports]) => (
                    <div key={`${year}-${month}`} className="timeline-month">
                      <h4 className="timeline-month-header">
                        {new Date(Number(year), Number(month)).toLocaleString('default', { month: 'long' })}
                      </h4>
                      <div className="timeline-reports">
                        {reports.map((report) => (
                          <div key={report.id} className="timeline-report">
                            <div className="timeline-marker"></div>
                            <MedicalReportCard
                              report={report}
                              onClick={() => handleReportSelect(report)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );

  return (
    <Routes>
      <Route index element={<ReportsList />} />
      <Route 
        path=":reportId" 
        element={
          <MedicalReportDetail 
            report={diagnosticReports.list.find(r => 
              r.id.toString() === location.pathname.split('/').pop()
            )}
            onBack={handleBack}
          />
        }
      />
    </Routes>
  );
}

export default MedicalReportsTab;