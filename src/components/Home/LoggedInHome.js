import React from "react";
import { Link } from "react-router-dom";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { FaTachometerAlt, FaPlusCircle, FaRobot, FaCog } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

function LoggedInHome() {
  const { user } = useAuth();

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

      {/* Main Options */}
      <Row className="text-center">
        {/* Health Dashboard */}
        <Col md={6} lg={3} className="mb-4">
          <Card className="action-card shadow h-100">
            <Card.Body className="d-flex flex-column">
              <div className="text-primary mb-3">
                <FaTachometerAlt size={48} />
              </div>
              <h5>Health Dashboard</h5>
              <p className="flex-grow-1">View and manage all your health information in one place.</p>
              <Button as={Link} to="/patient-dashboard" variant="primary">
                Go to Dashboard
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Simplified Add Health Data Card */}
        <Col md={6} lg={3} className="mb-4">
          <Card className="action-card shadow h-100">
            <Card.Body className="d-flex flex-column">
              <div className="text-info mb-3">
                <FaPlusCircle size={48} />
              </div>
              <h5>Add Health Data</h5>
              <p className="flex-grow-1">Add health records by connecting to providers or uploading documents.</p>
              <Button as={Link} to="/add-health-data" variant="info">
                Add Data
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Talk to AI */}
        <Col md={6} lg={3} className="mb-4">
          <Card className="action-card shadow h-100">
            <Card.Body className="d-flex flex-column">
              <div className="text-success mb-3">
                <FaRobot size={48} />
              </div>
              <h5>Talk to AI</h5>
              <p className="flex-grow-1">Chat with our AI assistant to get insights about your health data.</p>
              <Button as={Link} to="/ai-chat" variant="success">
                Start Conversation
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default LoggedInHome;