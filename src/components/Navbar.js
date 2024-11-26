import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { FaHome, FaUserPlus, FaSignInAlt, FaSignOutAlt, FaTachometerAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext'; // Import the auth context
import { useNavigate } from "react-router-dom"; // Import useNavigate

function CustomNavbar() {
  const { isAuthenticated, logout } = useAuth(); // Consume the auth state
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.reload();
    navigate('/'); // Redirect to the home page
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
            {isAuthenticated ? (
              <>
                <Nav.Link as={Link} to="/patient-dashboard">
                  <FaTachometerAlt /> Dashboard
                </Nav.Link>
                <Nav.Link href="#" onClick={handleLogout}>
                  <FaSignOutAlt /> Logout
                </Nav.Link>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/register">
                  <FaUserPlus /> Register
                </Nav.Link>
                <Nav.Link as={Link} to="/login">
                  <FaSignInAlt /> Login
                </Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default CustomNavbar;