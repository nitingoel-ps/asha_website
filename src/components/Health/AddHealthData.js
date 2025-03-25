import React from "react";
import { Link } from "react-router-dom";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { FaHospital, FaFileUpload, FaPills, FaHeartbeat, FaThermometerHalf } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import "./AddHealthData.css";

function AddHealthData() {
  const { user } = useAuth();

  const automaticOptions = [
    {
      icon: <FaHospital size={32} className="text-primary" />,
      title: "Connect Provider",
      description: "Connect with your healthcare providers to automatically sync your health data",
      link: "/add-providers",
      variant: "primary"
    },
    {
      icon: <FaFileUpload size={32} className="text-info" />,
      title: "Upload Documents",
      description: "Upload your medical documents and reports for automatic data extraction",
      link: "/my-documents",
      variant: "info"
    }
  ];

  const manualOptions = [
    {
      icon: <FaPills size={32} className="text-success" />,
      title: "Add Medication",
      description: "Record your medications, dosage, and schedule",
      link: "/patient-dashboard/med",
      variant: "success"
    },
    {
      icon: <FaHeartbeat size={32} className="text-danger" />,
      title: "Record Vitals",
      description: "Log your vital signs like blood pressure, heart rate, and temperature",
      link: "/patient-dashboard/vital-signs",
      variant: "danger"
    },
    {
      icon: <FaThermometerHalf size={32} className="text-warning" />,
      title: "Record Symptom",
      description: "Track your symptoms and their severity",
      link: "/patient-dashboard/symptoms",
      variant: "warning"
    }
  ];

  return (
    <Container className="add-health-data-container">
      <h2 className="page-title">Add Health Data</h2>
      
      {/* Desktop Layout */}
      <div className="desktop-layout">
        <div className="section">
          <h3>Automatic Data Entry</h3>
          <Row className="g-3">
            {automaticOptions.map((option, index) => (
              <Col xs={12} sm={6} key={index}>
                <Card className="health-data-card">
                  <Card.Body className="text-center">
                    <div className="icon-container">{option.icon}</div>
                    <Card.Title>{option.title}</Card.Title>
                    <Card.Text className="text-muted">{option.description}</Card.Text>
                    <Button 
                      as={Link} 
                      to={option.link} 
                      variant={option.variant} 
                      className="w-100"
                    >
                      {option.title}
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        <div className="section">
          <h3>Manual Data Entry</h3>
          <Row className="g-3">
            {manualOptions.map((option, index) => (
              <Col xs={12} sm={6} md={4} key={index}>
                <Card className="health-data-card">
                  <Card.Body className="text-center">
                    <div className="icon-container">{option.icon}</div>
                    <Card.Title>{option.title}</Card.Title>
                    <Card.Text className="text-muted">{option.description}</Card.Text>
                    <Button 
                      as={Link} 
                      to={option.link} 
                      variant={option.variant} 
                      className="w-100"
                    >
                      {option.title}
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="mobile-layout">
        <div className="section">
          <h3>Automatic Entry</h3>
          <div className="mobile-options">
            {automaticOptions.map((option, index) => (
              <Link key={index} to={option.link} className="mobile-option">
                <div className="mobile-option-content">
                  <div className="mobile-icon">{option.icon}</div>
                  <div className="mobile-title">{option.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="section">
          <h3>Manual Entry</h3>
          <div className="mobile-options">
            {manualOptions.map((option, index) => (
              <Link key={index} to={option.link} className="mobile-option">
                <div className="mobile-option-content">
                  <div className="mobile-icon">{option.icon}</div>
                  <div className="mobile-title">{option.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}

export default AddHealthData;
