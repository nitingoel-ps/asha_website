import React, { useState, useRef } from "react";
import { Card, Row, Col, Table } from "react-bootstrap";
import ObservationGraph from "./ObservationGraph";
import "./VitalSignsTab.css";
import { 
  FaHeart,         // for Blood Pressure
  FaWaveSquare,    // for Pulse
  FaLungsVirus,    // for Oxygen Saturation
  FaRuler,         // for Height
  FaWeight,        // for Weight
  FaChartLine      // for BMI
} from "react-icons/fa";

function VitalSignsTab({ vitals = [] }) {  // Add default empty array
  const [selectedVital, setSelectedVital] = useState(null);
  const graphRef = useRef(null);

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
    setSelectedVital(keyVitals[vitalSign].data);
    
    // Wait for the state update and rendering to complete
    setTimeout(() => {
      if (graphRef.current) {
        graphRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
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
      {selectedVital && selectedVital.length > 0 && (
        <>
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
          <Table striped bordered hover>
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
                  <td>{new Date(vital.date_taken).toLocaleDateString()}</td>
                  <td>{vital.source}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </div>
  );
}

export default VitalSignsTab;
