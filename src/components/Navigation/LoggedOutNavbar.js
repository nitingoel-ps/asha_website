import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { FaBars, FaTimes } from 'react-icons/fa';
import './Navigation.css';
import './navbar.css'; // Import our custom navbar styles
import './loggedout-navbar.css'; // Import specific styles for logged out navbar

function LoggedOutNavbar() {
  const [expanded, setExpanded] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navbarRef = useRef(null);

  useEffect(() => {
    // Add body class for proper padding
    document.body.classList.add('has-loggedout-navbar');
    
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setExpanded(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      // Remove body class when component unmounts
      document.body.classList.remove('has-loggedout-navbar');
    };
  }, []);

  const closeMobileMenu = () => setShowMobileMenu(false);
  const toggleMobileMenu = () => setShowMobileMenu(!showMobileMenu);

  return (
    <>
      <Navbar 
        ref={navbarRef}
        variant="dark" 
        expand="lg" 
        className="site-navbar loggedout-navbar"
        expanded={expanded}
        onToggle={(expanded) => setExpanded(expanded)}
        fixed="top"
      >
        <Container>
          <Navbar.Brand as={Link} to="/" className="text-white fw-bold" onClick={() => setExpanded(false)}>
            Asha AI
          </Navbar.Brand>
          
          {/* Custom mobile menu button */}
          <button 
            className="loggedout-navbar-toggler d-lg-none" 
            type="button"
            onClick={toggleMobileMenu}
            aria-controls="mobile-menu"
            aria-expanded={showMobileMenu}
            aria-label="Toggle navigation"
          >
            <FaBars />
          </button>
          
          {/* Desktop navigation */}
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/" className="logged-out-nav-item" onClick={() => setExpanded(false)}>Home</Nav.Link>
              <Nav.Link href="/#features" className="logged-out-nav-item" onClick={() => setExpanded(false)}>Features</Nav.Link>
              <Nav.Link href="/#how-it-works" className="logged-out-nav-item" onClick={() => setExpanded(false)}>How It Works</Nav.Link>
              <Nav.Link as={Link} to="/#waitlist" className="logged-out-nav-item" onClick={() => setExpanded(false)}>Sign Up</Nav.Link>
              <Nav.Link as={Link} to="/login" className="logged-out-nav-item ms-3" onClick={() => setExpanded(false)}>Login</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
      {/* Mobile menu overlay - separate from the logged-in mobile menu */}
      <div className={`loggedout-menu-backdrop ${showMobileMenu ? 'show' : ''}`} onClick={closeMobileMenu} aria-hidden="true" />
      
      {/* Mobile dropdown menu for logged out experience */}
      {showMobileMenu && (
        <div className="loggedout-mobile-menu show">
          <div className="loggedout-menu-items">
            <Link to="/" className="loggedout-menu-item" onClick={closeMobileMenu}>
              Home
            </Link>
            <a href="/#features" className="loggedout-menu-item" onClick={closeMobileMenu}>
              Features
            </a>
            <a href="/#how-it-works" className="loggedout-menu-item" onClick={closeMobileMenu}>
              How It Works
            </a>
            <a href="/#waitlist" className="loggedout-menu-item" onClick={closeMobileMenu}>
              Sign Up
            </a>
            <div className="loggedout-menu-divider"></div>
            <Link to="/login" className="loggedout-menu-item loggedout-login-item" onClick={closeMobileMenu}>
              Login
            </Link>
          </div>
          
          <div className="loggedout-menu-footer">
            <small>© 2025 Asha AI</small>
          </div>
          
          <button 
            className="loggedout-close-button" 
            onClick={closeMobileMenu}
            aria-label="Close menu"
          >
            Close <FaTimes style={{ fontSize: '0.75rem', marginLeft: '0.25rem', verticalAlign: 'middle' }} />
          </button>
        </div>
      )}
    </>
  );
}

export default LoggedOutNavbar;