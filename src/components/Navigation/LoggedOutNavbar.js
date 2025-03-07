import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Nav, Container } from 'react-bootstrap';
import './Navigation.css';
import './navbar.css'; // Import our custom navbar styles

function LoggedOutNavbar() {
  const [expanded, setExpanded] = useState(false);
  const navbarRef = useRef(null);
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setExpanded(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <Navbar 
      ref={navbarRef}
      variant="dark" 
      expand="lg" 
      className="site-navbar mobile-friendly-navbar"
      expanded={expanded}
      onToggle={(expanded) => setExpanded(expanded)}
    >
      <Container>
        <Navbar.Brand as={Link} to="/" className="text-white fw-bold" onClick={() => setExpanded(false)}>
          Aspen Health AI
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <Nav.Link href="/#features" className="logged-out-nav-item" onClick={() => setExpanded(false)}>Features</Nav.Link>
            <Nav.Link href="/#how-it-works" className="logged-out-nav-item" onClick={() => setExpanded(false)}>How It Works</Nav.Link>
            <Nav.Link as={Link} to="/#waitlist" className="logged-out-nav-item" onClick={() => setExpanded(false)}>Sign Up</Nav.Link>
            <Nav.Link as={Link} to="/login" className="logged-out-nav-item ms-3" onClick={() => setExpanded(false)}>Login</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default LoggedOutNavbar;