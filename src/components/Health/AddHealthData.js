import React from "react";
import { Link } from "react-router-dom";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { FaHospital, FaFileUpload, FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

function AddHealthData() {
  const { user } = useAuth();

  return (
    <Container className="mt-5">
      {/* Header Section */}
      <Row className="mb-4">
        <Col>
          <Link to="/" className="text-decoration-none mb-4 d-inline-block">
            <FaArrowLeft className="me-2" />
            Back to Dashboard
          </Link>
          <h1 className="mt-3">Add Health Data</h1>
          <p className="lead">
            Choose how you'd like to add your health information to ASHA AI.
          </p>
        </Col>
      </Row>

      {/* Options Cards */}
      <Row className="mt-4">
        {/* Connect to Providers Card */}
        <Col md={6} className="mb-4">
          <Card className="h-100 shadow">
            <Card.Body className="d-flex flex-column">
              <div className="text-primary mb-3">
                <FaHospital size={64} />
              </div>
              <h3>Connect to Healthcare Providers</h3>
              <p className="flex-grow-1">
                Securely connect to your healthcare providers to import your medical records, 
                test results, and other health information.
              </p>
              <ul className="mb-4">
                <li>Automatic data synchronization</li>
                <li>Access health records from multiple providers</li>
                <li>Keep your records up-to-date</li>
              </ul>
              <Button as={Link} to="/add-providers" variant="primary" size="lg" className="mt-auto">
                Connect to Providers
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Upload Documents Card */}
        <Col md={6} className="mb-4">
          <Card className="h-100 shadow">
            <Card.Body className="d-flex flex-column">
              <div className="text-info mb-3">
                <FaFileUpload size={64} />
              </div>
              <h3>Upload Medical Documents</h3>
              <p className="flex-grow-1">
                Manually upload your medical documents, lab results, prescriptions, and other health-related files.
              </p>
              <ul className="mb-4">
                <li>Support for multiple file formats</li>
                <li>Secure document storage</li>
                <li>Add notes and categorize your documents</li>
              </ul>
              <Button as={Link} to="/my-documents" variant="info" size="lg" className="mt-auto">
                Upload Documents
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default AddHealthData;
