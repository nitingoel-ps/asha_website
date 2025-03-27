import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown, Image } from 'react-bootstrap';
import { FaHome, FaSignOutAlt, FaTachometerAlt, FaCog, FaRobot, FaPlusCircle, FaBars, FaHeartbeat, FaMicrophone, FaEllipsisH } from 'react-icons/fa';
import { PiUserSound } from "react-icons/pi";

import { useAuth } from '../../context/AuthContext';
import { useNavigate } from "react-router-dom";
import MobileMenu from './MobileMenu';
import './navbar.css'; // Import custom navbar styles

function LoggedInNavbar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navbarRef = useRef(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Home';
    if (path.includes('patient-dashboard')) return 'Records';
    if (path.includes('add-health-data')) return 'Add Records';
    if (path.includes('websocket-voice')) return 'Talk to Asha';
    return 'Asha AI';
  };

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
  const toggleMobileMenu = () => setShowMobileMenu(prev => !prev);
  const closeMobileMenu = () => setShowMobileMenu(false);

  const isMobile = windowWidth < 992;

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
      {/* Desktop Navbar */}
      {!isMobile && (
        <Navbar className="navbar mobile-friendly-navbar" variant="dark" expand="lg">
          <Container>
            <Navbar.Brand as={Link} to="/">
              <FaHome className="nav-icon" /> ASHA AI
            </Navbar.Brand>
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="main-nav-items mx-auto">
                <Nav.Link as={Link} to="/patient-dashboard" className="main-nav-item">
                  <FaHeartbeat className="main-nav-icon" /> Health Records
                </Nav.Link>
                <Nav.Link as={Link} to="/add-health-data" className="main-nav-item">
                  <FaPlusCircle className="main-nav-icon" /> Add Health Data
                </Nav.Link>
                <Nav.Link as={Link} to="/websocket-voice" className="main-nav-item">
                  <FaMicrophone className="main-nav-icon" /> Talk to AI
                </Nav.Link>
              </Nav>
              <Nav className="user-nav-section">
                <NavDropdown 
                  title={<span className="user-name">{user?.first_name || user?.username || "User"}</span>}
                  id="user-dropdown"
                  align="end"
                >
                  <NavDropdown.Item as={Link} to="/configuration">
                    <FaCog className="nav-icon" /> Configuration
                  </NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>
                    <FaSignOutAlt className="nav-icon" /> Logout
                  </NavDropdown.Item>
                </NavDropdown>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      )}

      {/* Mobile Layout */}
      {isMobile && (
        <>
          {/* Top Bar */}
          <div className="mobile-top-bar">
            <div className="mobile-page-title">{getPageTitle()}</div>
          </div>

          {/* Bottom Navigation Bar */}
          <div className="mobile-bottom-nav">
            <Link to="/" className="mobile-nav-item">
              <FaHome />
              <span>Home</span>
            </Link>
            <Link to="/patient-dashboard" className="mobile-nav-item">
              <FaHeartbeat />
              <span>Records</span>
            </Link>
            <Link to="/websocket-voice" className="mobile-nav-item">
              <FaMicrophone />
              <span>Asha</span>
            </Link>
            <Link to="/add-health-data" className="mobile-nav-item">
              <FaPlusCircle />
              <span>Add</span>
            </Link>
            <button className="mobile-nav-item" onClick={toggleMobileMenu}>
              <FaEllipsisH />
              <span>More</span>
            </button>
          </div>

          {/* Mobile Menu (Slide-in) */}
          <MobileMenu 
            show={showMobileMenu} 
            onClose={closeMobileMenu} 
            user={user} 
            onLogout={handleLogout}
          />
        </>
      )}
    </>
  );
}

export default LoggedInNavbar;