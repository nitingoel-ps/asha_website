import React, { useState, useMemo, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Card, Container, Button, Row, Col } from 'react-bootstrap';
import { Grid, Clock } from 'lucide-react';
import MedicalReportCard from './MedicalReports/MedicalReportCard';
import MedicalReportDetail from './MedicalReports/MedicalReportDetail';
import './MedicalReportsTab.css';

// Separate GridView component
const GridView = React.memo(({ reports, onReportSelect }) => (
  <Row xs={1} md={2} lg={3} className="g-4">
    {reports.map((report) => (
      <Col key={report.id}>
        <MedicalReportCard
          report={report}
          onClick={() => onReportSelect(report)}
        />
      </Col>
    ))}
  </Row>
));

// Separate TimelineView component
const TimelineView = React.memo(({ groupedReports, onReportSelect }) => (
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
                        onClick={() => onReportSelect(report)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ))}
  </div>
));

// Separate ReportsList component
const ReportsList = React.memo(({ diagnosticReports, view, setView, groupedReports, onReportSelect }) => (
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

    <div className="grid-container">
      {view === "grid" ? (
        <GridView reports={diagnosticReports.list} onReportSelect={onReportSelect} />
      ) : (
        <TimelineView groupedReports={groupedReports} onReportSelect={onReportSelect} />
      )}
    </div>
  </div>
));

function MedicalReportsTab({ diagnosticReports }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState("grid");

  const handleReportSelect = useCallback((report) => {
    navigate(`${report.id}`);
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate('..');
  }, [navigate]);

  const groupedReports = useMemo(() => {
    return diagnosticReports.list.reduce((acc, report) => {
      const date = new Date(report.report_date);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = [];
      acc[year][month].push(report);
      return acc;
    }, {});
  }, [diagnosticReports.list]);

  const currentReport = useMemo(() => {
    const reportId = location.pathname.split('/').pop();
    return diagnosticReports.list.find(r => r.id.toString() === reportId);
  }, [diagnosticReports.list, location.pathname]);

  return (
    <Routes>
      <Route 
        index 
        element={
          <ReportsList 
            diagnosticReports={diagnosticReports}
            view={view}
            setView={setView}
            groupedReports={groupedReports}
            onReportSelect={handleReportSelect}
          />
        }
      />
      <Route 
        path=":reportId" 
        element={
          <MedicalReportDetail 
            report={currentReport}
            onBack={handleBack}
          />
        }
      />
    </Routes>
  );
}

export default React.memo(MedicalReportsTab);