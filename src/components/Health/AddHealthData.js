import React from "react";
import { Link } from "react-router-dom";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { FaHospital, FaFileUpload, FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

function AddHealthData() {
  const { user } = useAuth();

  return (
    <Container className="mt-4">
      {/* Back Button */}
      <Link to="/" className="text-decoration-none d-inline-block mb-3">
        <FaArrowLeft className="me-2" />
        Back
      </Link>
      
      {/* Simple Header */}
      <h2 className="mb-4">Add Health Data</h2>
      
      {/* Options Cards */}
      <Row className="g-3">
        {/* Connect to Providers */}
        <Col xs={12} sm={6}>
          <Card className="text-center p-3 h-100">
            <div className="mb-3">
              <FaHospital size={32} className="text-primary" />
            </div>
            <h5>Connect Provider</h5>
            <Button 
              as={Link} 
              to="/add-providers" 
              variant="primary" 
              className="w-100 mt-2"
            >
              Connect
            </Button>
          </Card>
        </Col>

        {/* Upload Documents */}
        <Col xs={12} sm={6}>
          <Card className="text-center p-3 h-100">
            <div className="mb-3">
              <FaFileUpload size={32} className="text-info" />
            </div>
            <h5>Upload Documents</h5>
            <Button 
              as={Link} 
              to="/my-documents" 
              variant="info" 
              className="w-100 mt-2"
            >
              Upload
            </Button>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default AddHealthData;
