import React, { useState, useRef, useEffect } from "react";
import { Card, Row, Col, Table, Container, Spinner } from "react-bootstrap";
import ObservationGraph from "./ObservationGraph";
import "./VitalSignsTab.css";
import { 
  FaHeart,
  FaWaveSquare,
  FaLungsVirus,
  FaRuler,
  FaWeight,
  FaChartLine,
  FaCalendarAlt,
  FaHospital
} from "react-icons/fa";

function VitalSignsTab({ vitals = [] }) {
  const [selectedVital, setSelectedVital] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const detailsRef = useRef(null);
  const graphRef = useRef(null);  // Add the missing graphRef
  const shouldScrollRef = useRef(false);

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Effect to handle scrolling to details after they're rendered
  useEffect(() => {
    if (shouldScrollRef.current && detailsRef.current && !isLoading) {
      const scrollToDetails = () => {
        detailsRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        shouldScrollRef.current = false;
      };
      
      // Use a short timeout to ensure DOM is fully updated
      const timer = setTimeout(scrollToDetails, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedVital, isLoading]);

  const keyVitals = vitals ? {
    "Blood Pressure": {
      data: vitals.filter(v => v.vital_sign === "Blood Pressure"),
      icon: <FaHeart className="vital-icon" />
    },
    "Pulse": {
      data: vitals.filter(v => v.vital_sign === "Pulse"),
      icon: <FaWaveSquare className="vital-icon" />
    },
    "Oxygen Saturation": {
      data: vitals.filter(v => v.vital_sign === "Oxygen Saturation"),
      icon: <FaLungsVirus className="vital-icon" />
    },
    "Height": {
      data: vitals.filter(v => v.vital_sign === "Height"),
      icon: <FaRuler className="vital-icon" />
    },
    "Weight": {
      data: vitals.filter(v => v.vital_sign === "Weight"),
      icon: <FaWeight className="vital-icon" />
    },
    "Body Mass Index": {
      data: vitals.filter(v => v.vital_sign === "Body Mass Index"),
      icon: <FaChartLine className="vital-icon" />
    }
  } : {};

  const handleCardClick = (vitalSign) => {
    setIsLoading(true);
    setSelectedVital(keyVitals[vitalSign].data);
    shouldScrollRef.current = true;
    
    // Short timeout just to show loading state
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="vital-signs-tab">
      <h3>Vital Signs</h3>
      <div className="row">
        {Object.entries(keyVitals).map(([vitalSign, { data = [], icon }]) => {  // Add default empty array
          const latestVital = data[0];
          return (
            <Card 
              key={vitalSign}
              className="vital-signs-card"
              onClick={() => handleCardClick(vitalSign)}
              style={{ cursor: "pointer" }}
            >
              <Card.Body>
                <div className="vital-card-header">
                  <Card.Title>{vitalSign}</Card.Title>
                  <span className="vital-date">
                    {latestVital ? new Date(latestVital.date_taken).toLocaleDateString() : "No date"}
                  </span>
                </div>
                {latestVital && (
                  <div className="vital-reading-container">
                    {icon}
                    <Card.Text>
                      {latestVital.reading}
                    </Card.Text>
                    <div className="vital-unit">
                      {latestVital.units_of_measure}
                    </div>
                  </div>
                )}
                {!latestVital && (
                  <Card.Text>No data</Card.Text>
                )}
              </Card.Body>
            </Card>
          );
        })}
      </div>
      
      {isLoading && (
        <div className="text-center py-4" id="loading-indicator">
          <div className="spinner-container">
            <Spinner animation="border" variant="primary" />
            <span className="loading-text">Loading</span>
          </div>
        </div>
      )}
      
      {selectedVital && selectedVital.length > 0 && !isLoading && (
        <div 
          className="selected-vital-details" 
          ref={detailsRef} 
          id="vital-details-section"
          tabIndex="-1"
        >
          <div className="graph-container" ref={graphRef}>
            <ObservationGraph
              data={{
                observationName: selectedVital[0]?.vital_sign || '',
                points: selectedVital.map(v => ({
                  date: v.date_taken,
                  value: v.reading
                })),
                uom: selectedVital[0]?.units_of_measure || '',
                referenceRange: selectedVital[0]?.reference_range || null,
                explanation: selectedVital[0]?.explanation || ''
              }}
            />
          </div>
          
          {/* Desktop table view */}
          {!isMobile && (
            <div className="table-responsive">
              <Table striped bordered hover className="vital-table">
                <thead>
                  <tr>
                    <th>Vital Sign</th>
                    <th>Reading</th>
                    <th>Units</th>
                    <th>Date Taken</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedVital.map((vital) => (
                    <tr key={vital.id}>
                      <td>{vital.vital_sign}</td>
                      <td>{vital.reading}</td>
                      <td>{vital.units_of_measure}</td>
                      <td>{formatDate(vital.date_taken)}</td>
                      <td>{vital.source}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
          
          {/* Mobile card view */}
          {isMobile && (
            <div className="mobile-vital-cards">
              <h5 className="mobile-section-header">{selectedVital[0]?.vital_sign} History</h5>
              {selectedVital.map((vital) => (
                <Card key={vital.id} className="mobile-vital-detail-card mb-3">
                  <Card.Body>
                    <div className="mobile-vital-header">
                      <div className="reading-value">
                        {vital.reading} <span className="units">{vital.units_of_measure}</span>
                      </div>
                    </div>
                    <div className="mobile-vital-details">
                      <div className="detail-item">
                        <FaCalendarAlt className="detail-icon" />
                        <span>{formatDate(vital.date_taken)}</span>
                      </div>
                      <div className="detail-item">
                        <FaHospital className="detail-icon" />
                        <span>{vital.source || "Unknown source"}</span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VitalSignsTab;
