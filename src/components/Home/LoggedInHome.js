// src/components/Home/LoggedInHome.js
import React from "react";
import { Link } from "react-router-dom";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext"; // Ensure AuthContext is implemented

function LoggedInHome() {
  const { user } = useAuth(); // Fetch user details from AuthContext

  return (
    <Container className="logged-in-container mt-5">
      {/* Greeting Section */}
      <Row className="text-center mb-5">
        <Col>
          <h1>Welcome back, {user?.first_name || "User"}!</h1>
          <p className="lead">
            Take control of your health data, connect with providers, and keep everything secure in one place.
          </p>
        </Col>
      </Row>

      {/* Actionable Cards Section */}
      <Row className="text-center">
        <Col md={4} sm={6} className="mb-4">
          <Card className="action-card shadow">
            <Card.Body>
              <i className="bi bi-person-bounding-box display-4 text-primary mb-3"></i>
              <h5>Health Dashboard</h5>
              <p>View and manage all your health and insurance data in one place.</p>
              <Button as={Link} to="/patient-dashboard" variant="primary">
                Go to Dashboard
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} sm={6} className="mb-4">
          <Card className="action-card shadow">
            <Card.Body>
              <i className="bi bi-link display-4 text-info mb-3"></i>
              <h5>Connect to Providers</h5>
              <p>Easily connect with your healthcare providers to pull your health data.</p>
              <Button as={Link} to="/add-providers" variant="info">
                Connect Providers
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} sm={6} className="mb-4">
          <Card className="action-card shadow">
            <Card.Body>
              <i className="bi bi-cloud-upload display-4 text-success mb-3"></i>
              <h5>Upload Data</h5>
              <p>Manually upload health data or files from your computer or email.</p>
              <Button as={Link} to="/upload-files" variant="success">
                Upload Files
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default LoggedInHome;