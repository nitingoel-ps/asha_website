import React, { useState, useEffect } from "react";
import { Card, Table, Button, Collapse, OverlayTrigger, Tooltip, FormControl, InputGroup } from "react-bootstrap";
import { FaCheckCircle, FaExclamationTriangle, FaSort, FaSortUp, FaSortDown } from "react-icons/fa"; // Import icons from Font Awesome
import "./DiagnosticReportsTab.css";

function DiagnosticReportsTab({ diagnosticReports, initialReportId }) {
  const [expandedReportId, setExpandedReportId] = useState(initialReportId || null);
  const [searchTerm, setSearchTerm] = useState(initialReportId ? initialReportId.toString() : "");
  const [sortConfig, setSortConfig] = useState({ key: "report_date", direction: "desc" });

  // Function to toggle a report's observations
  const toggleObservations = (reportId) => {
    setExpandedReportId((prevId) => (prevId === reportId ? null : reportId));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"; // Return "N/A" if dateString is null or undefined
    const options = { day: "numeric", month: "short", year: "numeric" };
    const date = new Date(dateString);
    if (isNaN(date)) return "N/A"; // Handle invalid dates
    if (dateString.includes("T")) {
      return date.toLocaleDateString("en-US", options);
    } else {
      return date.toLocaleDateString("en-US", options);
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Add useEffect to handle initialReportId changes
  useEffect(() => {
    if (initialReportId) {
      setExpandedReportId(initialReportId);
      setSearchTerm(initialReportId.toString());
      
      // Find the report and scroll it into view
      const reportElement = document.getElementById(`report-${initialReportId}`);
      if (reportElement) {
        reportElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [initialReportId]);

  // Modify the sorting and filtering logic to prioritize the selected report
  const sortedReports = [...diagnosticReports.list]
    .sort((a, b) => {
      // If there's an initialReportId, put that report first
      if (initialReportId) {
        if (a.id === initialReportId) return -1;
        if (b.id === initialReportId) return 1;
      }
      
      // ...rest of your existing sort logic...
      if (sortConfig.key === "report_date") {
        const dateA = new Date(a[sortConfig.key]);
        const dateB = new Date(b[sortConfig.key]);
        return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
      } else {
        const valueA = a[sortConfig.key] || "";
        const valueB = b[sortConfig.key] || "";
        return sortConfig.direction === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      }
    })
    .filter((report) => {
      if (!report) return false; // Skip null reports
      if (initialReportId && report.id === initialReportId) return true;
      
      const searchLower = searchTerm.toLowerCase();
      const reportId = report.id ? report.id.toString() : '';
      const reportName = report.report_name ? report.report_name.toLowerCase() : '';
      
      return reportName.includes(searchLower) || reportId.includes(searchLower);
    });

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? <FaSortUp /> : <FaSortDown />;
    }
    return <FaSort />;
  };

  // Expand the initial report when component mounts
  React.useEffect(() => {
    if (initialReportId) {
      setExpandedReportId(initialReportId);
      setSearchTerm(initialReportId.toString());
    }
  }, [initialReportId]);

  return (
    <>
      {/* Diagnostic Reports Summary */}
      <Card className="mt-4 mb-3"> {/* Added mb-3 to create a gap below the summary */}
        <Card.Body>
          <Card.Title>Diagnostic Reports Summary</Card.Title>
          <Card.Text
            style={{
              whiteSpace: "pre-wrap", // Preserve line breaks and wrap long text
            wordWrap: "break-word", // Prevent words from overflowing
              maxHeight: "200px", // Set a maximum height for vertical scrolling
              overflowY: "auto", // Enable vertical scrolling when content exceeds maxHeight
            }}
          >
            {diagnosticReports.summary}
          </Card.Text>
        </Card.Body>
      </Card>
      
      {/* Search Bar */}
      <InputGroup className="mb-2"> {/* Reduced mb-3 to mb-2 to reduce space */}
        <FormControl
          placeholder="Search by report name or ID"
          value={searchTerm}
          onChange={handleSearch}
        />
      </InputGroup>

      {/* Diagnostic Reports Table */}
      <Table striped bordered hover className="mt-2" style={{ tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ width: "20%" }} onClick={() => handleSort("report_name")}>
              Report {getSortIcon("report_name")}
            </th>
            <th style={{ width: "20%" }} onClick={() => handleSort("source")}>
              Source {getSortIcon("source")}
            </th>
            <th style={{ width: "15%" }} onClick={() => handleSort("report_date")}>
              Issued Date {getSortIcon("report_date")}
            </th>
            <th style={{ width: "15%" }} onClick={() => handleSort("report_type")}>
              Category {getSortIcon("report_type")}
            </th>
            <th style={{ width: "30%" }}>Conclusion</th>
          </tr>
        </thead>
        <tbody>
          {sortedReports.map((report) => (
            <React.Fragment key={report.id}>
              <tr id={`report-${report.id}`}>
                <td>
                  {/* Clicking the report toggles observations */}
                  <Button
                    variant="link"
                    className="text-start"
                    style={{ textDecoration: "underline", cursor: "pointer" }}
                    onClick={() => toggleObservations(report.id)}
                  >
                    {report.report_name}
                  </Button>
                </td>
                <td>{report.source || "N/A"}</td>
                <td>{formatDate(report.report_date)}</td>
              <td>{report.report_type || "N/A"}</td>
              <td>{report.report_summary || "N/A"}</td>              
            </tr>
              {/* Observations Row */}
              <tr>
                <td colSpan={5}>
                  <Collapse in={expandedReportId === report.id}>
                    <div style={{ width: "100%" }}>
                      {report.observations.length > 0 ? (
                        <Table bordered size="sm" className="mb-0">
                          <thead>
                            <tr>
                            <th style={{ width: "20%" }}>Observation</th>
                            <th style={{ width: "25%" }}>Value</th>
                            <th style={{ width: "10%" }}>Date</th>
                            <th style={{ width: "10%", textAlign: "center" }}>Is Normal</th>
                            <th style={{ width: "35%" }}>Explanation</th>                          
                            </tr>
                          </thead>
                          <tbody>
                            {report.observations.map((obs) => (
                              <tr key={obs.id}>
                                {/* Observation Name with Tooltip */}
                                <td>{obs.name || "N/A"}</td>
                                <td>
                                  {obs.value !== null && obs.value !== undefined ? (
                                    obs.value
                                  ) : obs.value_str ? (
                                    <OverlayTrigger
                                      trigger="click"
                                      placement="top"
                                      rootClose // Ensures tooltip closes when clicking outside
                                      overlay={
                                        <Tooltip id={`tooltip-${obs.id}`} className="custom-tooltip">
                                          {obs.value_str}
                                        </Tooltip>
                                      }
                                    >
                                      <Button variant="link" className="p-0" style={{ textDecoration: "underline", cursor: "pointer" }}>
                                        Report
                                      </Button>
                                    </OverlayTrigger>
                                  ) : (
                                    "N/A"
                                  )}
                                </td>                                
                                <td>{formatDate(obs.observation_date)}</td>
                                <td align="center">
                                  {obs.is_normal === true ? (
                                    <FaCheckCircle style={{ color: "green" }} title="Normal" />
                                  ) : obs.is_normal === false ? (
                                    <FaExclamationTriangle style={{ color: "red" }} title="Not Normal" />
                                  ) : null}
                                </td>
                                <td>{obs.explanation || "N/A"}</td>                                
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      ) : (
                        <p className="text-muted m-2">
                          No observations available for this report.
                        </p>
                      )}
                    </div>
                  </Collapse>
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </Table>
    </>
  );
}

export default DiagnosticReportsTab;
