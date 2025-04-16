import React, { useState, useMemo, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Card, Container } from 'react-bootstrap';
import MedicalReportCard from './MedicalReports/MedicalReportCard';
import MedicalReportDetail from './MedicalReports/MedicalReportDetail';
import EmptyStateMessage from '../Common/EmptyStateMessage';
import { ConnectionProvider } from '../../context/ConnectionContext';
import '../Common/EmptyStateMessage.css';
import './MedicalReportsTab.css';

// Separate YearGroupView component
const YearGroupView = React.memo(({ groupedReports, onReportSelect }) => (
  <div className="reports-container">
    <div className="reports-header">
      <h2>Medical Reports</h2>
    </div>
    {Object.entries(groupedReports)
      .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
      .map(([year, reports]) => (
        <div key={year} className="year-group">
          <div className="year-header">{year}</div>
          <div className="year-reports">
            {reports
              .sort((a, b) => new Date(b.report_date) - new Date(a.report_date))
              .map((report) => (
                <div key={report.id} className="report-item">
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
));

// Main component
function MedicalReportsTab({ diagnosticReports }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleReportSelect = useCallback((report) => {
    navigate(`${report.id}`);
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate('..');
  }, [navigate]);

  const groupedReports = useMemo(() => {
    if (!diagnosticReports?.list?.length) {
      return {};
    }
    
    return diagnosticReports.list.reduce((acc, report) => {
      const year = new Date(report.report_date).getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(report);
      return acc;
    }, {});
  }, [diagnosticReports?.list]);

  const currentReport = useMemo(() => {
    const reportId = location.pathname.split('/').pop();
    return diagnosticReports?.list?.find(r => r.id.toString() === reportId);
  }, [diagnosticReports?.list, location.pathname]);

  // Check if we have reports data
  const hasReports = diagnosticReports?.list && diagnosticReports.list.length > 0;

  // If no data, return empty state handler
  if (!hasReports) {
    return (
      <ConnectionProvider>
        <EmptyStateMessage section="medical-reports" />
      </ConnectionProvider>
    );
  }

  return (
    <Routes>
      <Route 
        index 
        element={
          <div className="h-100 d-flex flex-column">
            <YearGroupView 
              groupedReports={groupedReports}
              onReportSelect={handleReportSelect}
            />
          </div>
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