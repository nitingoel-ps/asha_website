// src/components/Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Nav } from 'react-bootstrap';
import { FaHome, FaUserPlus, FaSignInAlt, FaSignOutAlt, FaTachometerAlt } from 'react-icons/fa'; // Import icons

function CustomNavbar() {
  const isAuthenticated = localStorage.getItem('access_token') ? true : false;

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.reload();
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Navbar.Brand as={Link} to="/">
        <FaHome /> Healthcare App
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="ms-auto">
          {isAuthenticated ? (
            <>
              <Nav.Link as={Link} to="/dashboard">
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
    </Navbar>
  );
}

export default CustomNavbar;