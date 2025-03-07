import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { FaBars, FaTimes } from 'react-icons/fa';
import './Navigation.css';
import './navbar.css'; // Import our custom navbar styles

function LoggedOutNavbar() {
  const [expanded, setExpanded] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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

  const closeMobileMenu = () => setShowMobileMenu(false);
  const toggleMobileMenu = () => setShowMobileMenu(!showMobileMenu);

  return (
    <>
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
          
          {/* Replace toggle with custom button for mobile menu - only visible on mobile */}
          <button 
            className="navbar-toggler d-lg-none" 
            type="button"
            onClick={toggleMobileMenu}
            aria-controls="mobile-slide-menu"
            aria-expanded={showMobileMenu}
            aria-label="Toggle navigation"
          >
            <FaBars />
          </button>
          
          {/* Desktop navigation */}
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
      
      {/* Mobile slide-in menu */}
      <div className={`mobile-menu-backdrop ${showMobileMenu ? 'show' : ''}`} onClick={closeMobileMenu} aria-hidden="true" />
      <div className={`mobile-slide-menu ${showMobileMenu ? 'show' : ''}`}>
        <div className="mobile-menu-header">
          <Link to="/" onClick={closeMobileMenu} className="text-decoration-none">
            <h5 className="mb-0 text-dark">Aspen Health AI</h5>
          </Link>
          <button className="mobile-menu-close" onClick={closeMobileMenu} aria-label="Close menu">
            <FaTimes />
          </button>
        </div>
        
        <ul className="mobile-menu-items">
          <li className="mobile-menu-item">
            <a href="/#features" className="mobile-menu-link" onClick={closeMobileMenu}>Features</a>
          </li>
          <li className="mobile-menu-item">
            <a href="/#how-it-works" className="mobile-menu-link" onClick={closeMobileMenu}>How It Works</a>
          </li>
          <li className="mobile-menu-item">
            <a href="/#waitlist" className="mobile-menu-link" onClick={closeMobileMenu}>Sign Up</a>
          </li>
          <li className="mobile-menu-divider"></li>
          <li className="mobile-menu-item">
            <Link to="/login" className="mobile-menu-link" onClick={closeMobileMenu}>Login</Link>
          </li>
        </ul>
        
        <div className="mobile-menu-footer">
          <small>© 2023 Aspen Health AI</small>
        </div>
      </div>
    </>
  );
}

export default LoggedOutNavbar;