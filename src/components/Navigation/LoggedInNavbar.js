import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown, Image } from 'react-bootstrap';
import { FaHome, FaSignOutAlt, FaTachometerAlt, FaCog, FaRobot, FaPlusCircle, FaBars, FaHeartbeat } from 'react-icons/fa';
import { PiUserSound } from "react-icons/pi";

import { useAuth } from '../../context/AuthContext';
import { useNavigate } from "react-router-dom";
import MobileMenu from './MobileMenu';
import './navbar.css'; // Import custom navbar styles

function LoggedInNavbar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navbarRef = useRef(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setExpanded(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    logout();
    navigate('/');
  };

  const closeMenu = () => setExpanded(false);
  const toggleMobileMenu = () => {
    setShowMobileMenu(prevState => !prevState);
    console.log("Toggling mobile menu, new state:", !showMobileMenu); // Add for debugging
  };
  const closeMobileMenu = () => setShowMobileMenu(false);

  // Get first name or username for display
  const displayName = user?.first_name || user?.username || "User";
  
  // Get initials for avatar fallback
  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    } else if (user?.first_name) {
      return user.first_name[0].toUpperCase();
    } else if (user?.username) {
      return user.username[0].toUpperCase();
    }
    return "U";
  };

  return (
    <>
      <Navbar 
        ref={navbarRef}
        className="navbar mobile-friendly-navbar" 
        variant="dark" 
        expand="lg"
        expanded={expanded}
      >
        <Container>
          {/* Brand on left */}
          <Navbar.Brand as={Link} to="/" onClick={closeMenu}>
            <FaHome className="nav-icon" /> ASHA AI
          </Navbar.Brand>
          
          {/* Mobile menu toggle button */}
          <button 
            className="navbar-toggler" 
            type="button"
            onClick={toggleMobileMenu}
            aria-controls="mobile-slide-menu"
            aria-expanded={showMobileMenu}
            aria-label="Toggle navigation"
          >
            <FaBars />
          </button>
          
          {/* Desktop navigation - hidden on mobile via CSS */}
          <Navbar.Collapse id="basic-navbar-nav" className="d-none d-lg-flex">
            {/* Main navigation items - centered on desktop */}
            <Nav className="main-nav-items mx-auto">
              <Nav.Link as={Link} to="/patient-dashboard" onClick={closeMenu} className="main-nav-item">
                <FaHeartbeat className="main-nav-icon" /> Health Records
              </Nav.Link>
              
              <Nav.Link as={Link} to="/add-health-data" onClick={closeMenu} className="main-nav-item">
                <FaPlusCircle className="main-nav-icon" /> Add Health Data
              </Nav.Link>
              
              <Nav.Link as={Link} to="/ai-chat" onClick={closeMenu} className="main-nav-item">
                <PiUserSound className="main-nav-icon" /> Talk to AI
              </Nav.Link>
            </Nav>
            
            {/* User profile on right - with improved hover effect */}
            <Nav className="user-nav-section">
              <NavDropdown 
                title={
                  <div className="user-profile-dropdown">
                    {user?.profile_image ? (
                      <Image 
                        src={user.profile_image} 
                        roundedCircle 
                        className="user-avatar" 
                        alt={displayName}
                      />
                    ) : (
                      <div className="user-avatar-fallback">
                        {getInitials()}
                      </div>
                    )}
                    <span className="user-name ms-2">{displayName}</span>
                  </div>
                } 
                id="user-dropdown"
                align="end"
                className="user-dropdown-menu"
                menuVariant="light"
              >
                <NavDropdown.Item as={Link} to="/configuration" onClick={closeMenu}>
                  <FaCog className="nav-icon" /> Configuration
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={() => { closeMenu(); handleLogout(); }}>
                  <FaSignOutAlt className="nav-icon" /> Logout
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
      {/* Mobile slide-in menu */}
      <MobileMenu 
        show={showMobileMenu} 
        onClose={closeMobileMenu} 
        user={user} 
        onLogout={handleLogout}
      />
    </>
  );
}

export default LoggedInNavbar;