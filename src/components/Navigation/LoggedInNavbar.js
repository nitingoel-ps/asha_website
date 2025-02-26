import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { FaHome, FaSignOutAlt, FaTachometerAlt, FaFileUpload, FaHospital, FaCog, FaRobot } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from "react-router-dom";

function LoggedInNavbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const navbarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setExpanded(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    logout();
    navigate('/');
  };

  return (
    <Navbar 
      ref={navbarRef}
      className="navbar" 
      variant="dark" 
      expand="lg"
      expanded={expanded}
      onToggle={(expanded) => setExpanded(expanded)}
    >
      <Container>
        <Navbar.Brand as={Link} to="/" onClick={() => setExpanded(false)}>
          <FaHome /> ASHA AI
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <Nav.Link as={Link} to="/patient-dashboard" onClick={() => setExpanded(false)}>
              <FaTachometerAlt /> Dashboard
            </Nav.Link>
            <Nav.Link as={Link} to="/add-providers" onClick={() => setExpanded(false)}>
              <FaHospital /> Connect Providers
            </Nav.Link>
            <Nav.Link as={Link} to="/my-documents" onClick={() => setExpanded(false)}>
              <FaFileUpload /> Manage Files
            </Nav.Link>
            <Nav.Link as={Link} to="/configuration" onClick={() => setExpanded(false)}>
              <FaCog /> Configuration
            </Nav.Link>
            <Nav.Link as={Link} to="/ai-chat" onClick={() => setExpanded(false)}>
              <FaRobot /> AI Chat
            </Nav.Link>
            <Nav.Link onClick={() => { setExpanded(false); handleLogout(); }}>
              <FaSignOutAlt /> Logout
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default LoggedInNavbar;