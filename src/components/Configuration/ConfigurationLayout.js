import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link, Outlet } from 'react-router-dom';
import './ConfigurationLayout.css';

function ConfigurationLayout() {
  return (
    <Container fluid className="configuration-container">
      <Row>
        <Col md={3} className="sidebar">
          <h4 className="sidebar-header">Configuration</h4>
          <div className="nav flex-column">
            <div className="nav-group">
              <h6>Standard Labs</h6>
              <Link to="/configuration/lab-panel-review" className="nav-link">Lab Panel Review</Link>
              <Link to="/configuration/manage-standard-labs" className="nav-link">Manage Standard Labs</Link>
              <Link to="/configuration/manage-standard-panels" className="nav-link">Manage Standard Panels</Link>
            </div>
          </div>
        </Col>
        <Col md={9} className="content-area">
          <Outlet />
        </Col>
      </Row>
    </Container>
  );
}

export default ConfigurationLayout;
