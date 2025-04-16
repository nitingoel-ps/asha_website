import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown, Image } from 'react-bootstrap';
import { FaHome, FaSignOutAlt, FaTachometerAlt, FaCog, FaRobot, FaPlusCircle, FaBars, FaHeartbeat, FaMicrophone, FaEllipsisH, FaChevronLeft, FaPlus, FaKeyboard, FaBell, FaUserCircle, FaComments, FaRegComments } from 'react-icons/fa';
import { PiUserSound } from "react-icons/pi";
import { FiEdit, FiList } from "react-icons/fi";

import { useAuth } from '../../context/AuthContext';
import MobileMenu from './MobileMenu';
import './navbar.css'; // Import custom navbar styles

// Create a custom event bus for AI Chat actions
export const aiChatEvents = {
  TOGGLE_CHAT_LIST: 'ai-chat-toggle-list',
  NEW_CHAT: 'ai-chat-new-chat'
};

function LoggedInNavbar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navbarRef = useRef(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [customPageTitle, setCustomPageTitle] = useState(null);
  const [mobileActionButton, setMobileActionButton] = useState(null);

  // Expose the setMobilePageTitle function to window for other components to use
  useEffect(() => {
    window.setMobilePageTitle = (title) => {
      setCustomPageTitle(title);
    };

    window.setMobileActionButton = (config) => {
      setMobileActionButton(config);
    };

    return () => {
      window.setMobilePageTitle = null;
      window.setMobileActionButton = null;
    };
  }, []);

  // Get page title based on current route
  const getPageTitle = () => {
    // If a custom title is set, use it
    if (customPageTitle) {
      return customPageTitle;
    }
    
    const path = location.pathname;
    const pathSegments = path.split('/').filter(Boolean);
    
    // If we're in the root
    if (path === '/') return 'Home';
    
    // Appointments routes
    if (pathSegments[0] === 'appointments') {
      if (pathSegments.length === 1) {
        return 'My Appointments';
      } else if (pathSegments[1] === 'new') {
        return 'Add Appointment';
      } else {
        return 'Appointment Details';
      }
    }
    
    // Health Priorities routes
    if (pathSegments[0] === 'health-priorities') {
      if (pathSegments.length > 1) {
        return 'Priority Detail'; // For detail pages
      }
      return 'Health Priorities';
    }
    
    // If we're in the patient dashboard
    if (pathSegments[0] === 'patient-dashboard') {
      // If we're at the root of patient-dashboard
      if (pathSegments.length === 1) return 'Records';
      
      // Special case for observation URLs
      if (pathSegments[1] === 'observation' && pathSegments[2]) {
        return 'Observation';
      }
      
      // If we're in a section
      const section = pathSegments[1];
      const isDetail = pathSegments.length > 2;
      
      // Map sections to their titles
      const titleMap = {
        'vital-signs': {
          base: 'Vital Signs',
          detail: 'Vital Sign Details'
        },
        'immunizations': {
          base: 'Immunizations',
          detail: 'Immunization Details'
        },
        'visits': {
          base: 'Visits',
          detail: 'Visit Details'
        },
        'medical-reports': {
          base: 'Medical Reports',
          detail: 'Report Details'
        },
        'lab-panels': {
          base: 'Lab Panels',
          detail: 'Lab Results'
        },
        'med': {
          base: 'Medications',
          detail: 'Medication Details'
        },
        'health-priorities': {
          base: 'Health Priorities',
          detail: 'Priority Details'
        },
        'symptoms': {
          base: 'Symptoms',
          detail: 'Symptom Details'
        }
      };

      if (titleMap[section]) {
        return isDetail ? titleMap[section].detail : titleMap[section].base;
      }
      return 'Records';
    }
    
    // AI Chat routes
    if (path.includes('/ai-chat')) return 'Chat with Asha';
    
    // Other routes
    if (path.includes('add-health-data')) return 'Add Records';
    if (path.includes('websocket-voice')) return 'Talk to Asha';
    if (path.includes('add-providers')) return 'Provider Connections';
    return 'Asha AI';
  };

  // Check if we should show back button
  const shouldShowBackButton = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    // Show back button for appointment detail pages
    if (pathSegments[0] === 'appointments' && pathSegments.length > 1) {
      return true;
    }
    
    // Show back button for health priorities detail pages
    if (pathSegments[0] === 'health-priorities' && pathSegments.length > 1) {
      return true;
    }
    
    // Show back button for any patient-dashboard route except the root
    return pathSegments.length >= 2 && pathSegments[0] === 'patient-dashboard';
  };

  // Check if we're on the AI Chat page
  const isAIChatPage = () => {
    return location.pathname.includes('/ai-chat');
  };

  // Check if we're on the AI Voice page
  const isAIVoicePage = () => {
    return location.pathname.includes('/websocket-voice') || 
           location.pathname.includes('/ai-voice');
  };

  const handleBack = () => {
    // Check if there's a custom back handler set by a component
    if (window.mobileBackHandler) {
      window.mobileBackHandler();
      return;
    }
    
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    // Handle appointments back navigation
    if (pathSegments[0] === 'appointments') {
      navigate('/appointments');
      return;
    }
    
    // Handle health priorities back navigation
    if (pathSegments[0] === 'health-priorities' && pathSegments.length > 1) {
      navigate('/health-priorities');
      return;
    }
    
    // Special case for observation URLs - use browser history
    if (pathSegments[1] === 'observation' && pathSegments[2]) {
      window.history.back();
      return;
    }
    
    // If we're in a detail view (more than 2 segments)
    if (pathSegments.length > 2) {
      // Go back to the section list
      navigate(`/patient-dashboard/${pathSegments[1]}`);
    } else {
      // Go back to main dashboard
      navigate('/patient-dashboard');
    }
  };

  // Function to handle switching between voice and text chat
  const handleVoiceTextToggle = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    // If we're on the voice page, navigate to text chat
    if (isAIVoicePage()) {
      // Check if we have a session_id in the URL query params
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      // If we have a session ID, navigate to that specific chat
      if (sessionId) {
        navigate(`/ai-chat/${sessionId}`);
      } else {
        navigate('/ai-chat');
      }
    } 
    // If we're on any other page, navigate to voice chat
    else {
      // If we're on the AI Chat page with a session ID, pass it to the voice page
      if (isAIChatPage() && pathSegments.length > 1) {
        const chatSessionId = pathSegments[1];
        navigate(`/websocket-voice?session_id=${chatSessionId}`);
      } else {
        navigate('/websocket-voice');
      }
    }
  };

  // Function to handle AI Chat list toggle
  const handleToggleChatList = () => {
    // Dispatch custom event that ChatWindow will listen for
    const event = new CustomEvent(aiChatEvents.TOGGLE_CHAT_LIST);
    window.dispatchEvent(event);
  };
  
  // Function to handle new chat button
  const handleNewChat = () => {
    // Dispatch custom event that ChatWindow will listen for
    const event = new CustomEvent(aiChatEvents.NEW_CHAT);
    window.dispatchEvent(event);
  };

  // Function to handle mobile action button click
  const handleMobileActionClick = () => {
    if (mobileActionButton && mobileActionButton.action) {
      mobileActionButton.action();
    }
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

  const getAddButtonConfig = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    if (pathSegments.length !== 2 || pathSegments[0] !== 'patient-dashboard') return null;

    const section = pathSegments[1];
    const configs = {
      'med': {
        action: () => {
          // We'll emit a custom event that the medications component will listen for
          const event = new CustomEvent('openAddMedication');
          window.dispatchEvent(event);
        }
      },
      'symptoms': {
        action: () => {
          const event = new CustomEvent('openAddSymptom');
          window.dispatchEvent(event);
        }
      },
      'vital-signs': {
        action: () => {
          const event = new CustomEvent('openAddVital');
          window.dispatchEvent(event);
        }
      }
      // Add more sections as needed
    };

    return configs[section] || null;
  };

  const isVoicePage = () => {
    return location.pathname.includes('/websocket-voice') || location.pathname.includes('/ai-voice');
  };

  // Render dynamic mobile action button based on icon name
  const renderMobileActionButton = () => {
    if (!mobileActionButton) return null;
    
    switch(mobileActionButton.icon) {
      case 'plus':
        return <FaPlus />;
      case 'edit':
        return <FiEdit />;
      case 'cog':
        return <FaCog />;
      default:
        return <FaPlus />;
    }
  };

  const renderMainNav = () => (
    <Nav className="ms-auto">
      <Nav.Link 
        as={Link} 
        to="/health-priorities" 
        className={`nav-item ${location.pathname.includes('/health-priorities') ? 'active' : ''}`}
        onClick={closeMenu}
      >
        <FaHeartbeat className="nav-icon" />
        <span className="nav-text">Health Priorities</span>
      </Nav.Link>
      <Nav.Link 
        as={Link} 
        to="/patient-dashboard" 
        className={`nav-item ${location.pathname.includes('/patient-dashboard') ? 'active' : ''}`}
        onClick={closeMenu}
      >
        <FaTachometerAlt className="nav-icon" />
        <span className="nav-text">Records</span>
      </Nav.Link>
      <Nav.Link 
        as={Link} 
        to="/ai-chat" 
        className={`nav-item ${isAIChatPage() ? 'active' : ''}`}
        onClick={closeMenu}
      >
        <FaComments className="nav-icon" />
        <span className="nav-text">Chat</span>
      </Nav.Link>
      <Nav.Link 
        as={Link} 
        to="/websocket-voice" 
        className={`nav-item ${isAIVoicePage() ? 'active' : ''}`}
        onClick={closeMenu}
      >
        <PiUserSound className="nav-icon" />
        <span className="nav-text">Voice</span>
      </Nav.Link>
    </Nav>
  );

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
                <Nav.Link as={Link} to="/health-priorities" className="main-nav-item">
                  <FaHeartbeat className="main-nav-icon" /> Health Priorities
                </Nav.Link>
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
            {shouldShowBackButton() && (
              <button className="mobile-top-back-button" onClick={handleBack}>
                <FaChevronLeft />
              </button>
            )}
            
            {isAIChatPage() && (
              <button className="ai-chat-list-btn" onClick={handleToggleChatList}>
                <FiList />
              </button>
            )}
            
            <div className="mobile-page-title">{getPageTitle()}</div>
            
            {/* Render custom action button if available, else fallback to the page-specific one */}
            {mobileActionButton ? (
              <button 
                className="mobile-top-add-button"
                onClick={handleMobileActionClick}
                aria-label="Action button"
              >
                {renderMobileActionButton()}
              </button>
            ) : (
              getAddButtonConfig() && (
                <button 
                  className="mobile-top-add-button"
                  onClick={getAddButtonConfig().action}
                  aria-label="Add new item"
                >
                  <FaPlus />
                </button>
              )
            )}
            
            {isAIChatPage() && (
              <button className="ai-chat-new-btn" onClick={handleNewChat}>
                <FiEdit />
              </button>
            )}
            
            {isVoicePage() && (
              <button
                className="mobile-top-add-button"
                onClick={() => {
                  if (window.voiceSettingsHandlers) {
                    window.voiceSettingsHandlers.toggleSettings();
                  }
                }}
              >
                <FaCog />
              </button>
            )}
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
            <button 
              className="mobile-nav-item microphone-nav-item" 
              onClick={handleVoiceTextToggle}
            >
              {isAIVoicePage() ? (
                <>
                  <FaKeyboard className="microphone-icon" />
                  <span>Chat</span>
                </>
              ) : (
                <>
                  <FaMicrophone className="microphone-icon" />
                  <span>Voice</span>
                </>
              )}
            </button>
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