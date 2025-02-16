import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { FaHome, FaSignOutAlt, FaTachometerAlt, FaFileUpload, FaHospital } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from "react-router-dom";

function LoggedInNavbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    logout();
    navigate('/');
  };

  return (
    <Navbar className="navbar" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">
          <FaHome /> My Health 360
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <Nav.Link as={Link} to="/patient-dashboard">
              <FaTachometerAlt /> Dashboard
            </Nav.Link>
            <Nav.Link as={Link} to="/add-providers">
              <FaHospital /> Add Providers
            </Nav.Link>
            <Nav.Link as={Link} to="/upload-files">
              <FaFileUpload /> Upload Files
            </Nav.Link>
            <Nav.Link onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default LoggedInNavbar; 