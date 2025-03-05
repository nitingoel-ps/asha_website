import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { FaHome, FaSignOutAlt, FaTachometerAlt, FaFileUpload, FaHospital, FaCog, FaRobot, FaPlusCircle, FaChevronRight } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from "react-router-dom";
import './navbar.css'; // Import custom navbar styles

function LoggedInNavbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const navbarRef = useRef(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showSubMenu, setShowSubMenu] = useState(false);

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

  const isMobile = windowWidth < 992; // Bootstrap lg breakpoint

  const toggleSubMenu = (e) => {
    if (isMobile) {
      e.preventDefault();
      setShowSubMenu(!showSubMenu);
    }
  };

  return (
    <Navbar 
      ref={navbarRef}
      className="navbar mobile-friendly-navbar" 
      variant="dark" 
      expand="lg"
      expanded={expanded}
      onToggle={(expanded) => setExpanded(expanded)}
    >
      <Container>
        <Navbar.Brand as={Link} to="/" onClick={closeMenu}>
          <FaHome className="nav-icon" /> ASHA AI
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto mobile-nav">
            <Nav.Link as={Link} to="/patient-dashboard" onClick={closeMenu} className="nav-item">
              <FaTachometerAlt className="nav-icon" /> Health Dashboard
            </Nav.Link>
            
            {isMobile ? (
              // On mobile: create a collapsible parent item with sub-items
              <>
                <div 
                  className={`mobile-nav-parent ${showSubMenu ? 'active' : ''}`}
                  onClick={toggleSubMenu}
                >
                  <div className="mobile-nav-parent-content">
                    <FaPlusCircle className="nav-icon" /> Add Health Data
                  </div>
                  <FaChevronRight className={`submenu-arrow ${showSubMenu ? 'rotated' : ''}`} />
                </div>

                {showSubMenu && (
                  <div className="mobile-submenu">
                    <Nav.Link as={Link} to="/add-providers" onClick={closeMenu} className="mobile-nav-subitem">
                      <FaHospital className="nav-icon" /> Connect to Providers
                    </Nav.Link>
                    <Nav.Link as={Link} to="/upload-files" onClick={closeMenu} className="mobile-nav-subitem">
                      <FaFileUpload className="nav-icon" /> Upload Files Manually
                    </Nav.Link>
                  </div>
                )}
              </>
            ) : (
              // On desktop: use dropdown
              <NavDropdown 
                title={<><FaPlusCircle className="nav-icon" /> Add Health Data</>} 
                id="add-health-data-dropdown"
                className="nav-item"
              >
                <NavDropdown.Item as={Link} to="/add-providers" onClick={closeMenu}>
                  <FaHospital className="nav-icon" /> Connect to Providers
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/upload-files" onClick={closeMenu}>
                  <FaFileUpload className="nav-icon" /> Upload Files Manually
                </NavDropdown.Item>
              </NavDropdown>
            )}
            
            <Nav.Link as={Link} to="/ai-chat" onClick={closeMenu} className="nav-item">
              <FaRobot className="nav-icon" /> Talk to AI
            </Nav.Link>
            
            <Nav.Link as={Link} to="/configuration" onClick={closeMenu} className="nav-item">
              <FaCog className="nav-icon" /> Configuration
            </Nav.Link>
            
            <Nav.Link onClick={() => { closeMenu(); handleLogout(); }} className="nav-item">
              <FaSignOutAlt className="nav-icon" /> Logout
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default LoggedInNavbar;