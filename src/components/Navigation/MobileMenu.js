import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaTimes, FaCog, FaSignOutAlt, FaUser, FaBell, FaQuestionCircle, FaInfoCircle, FaHeartbeat, FaTachometerAlt } from 'react-icons/fa';
import './navbar.css';

const MobileMenu = ({ show, onClose, user, onLogout }) => {
  // Add effect to prevent body scroll when menu is open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  const handleLinkClick = () => {
    onClose();
  };

  const handleLogout = () => {
    onClose();
    onLogout();
  };

  // Don't render anything if not showing
  if (!show) {
    return null;
  }

  return (
    <>
      <div 
        className={`mobile-menu-backdrop ${show ? 'show' : ''}`} 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div 
        className={`mobile-slide-menu ${show ? 'show' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="More options menu"
      >
        <div className="mobile-menu-header">
          <h5 className="mb-0">More Options</h5>
          <button 
            className="mobile-menu-close" 
            onClick={onClose} 
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="mobile-menu-items">
          <Link to="/health-priorities" className="mobile-menu-link" onClick={handleLinkClick}>
            <FaHeartbeat className="mobile-menu-icon" />
            <span>Health Priorities</span>
          </Link>
          
          <Link to="/patient-dashboard" className="mobile-menu-link" onClick={handleLinkClick}>
            <FaTachometerAlt className="mobile-menu-icon" />
            <span>Health Records</span>
          </Link>
          
          <Link to="/profile" className="mobile-menu-link" onClick={handleLinkClick}>
            <FaUser className="mobile-menu-icon" />
            <span>Profile</span>
          </Link>
          
          <Link to="/configuration" className="mobile-menu-link" onClick={handleLinkClick}>
            <FaCog className="mobile-menu-icon" />
            <span>Settings</span>
          </Link>
          
          <Link to="/notifications" className="mobile-menu-link" onClick={handleLinkClick}>
            <FaBell className="mobile-menu-icon" />
            <span>Notifications</span>
          </Link>
          
          <Link to="/help" className="mobile-menu-link" onClick={handleLinkClick}>
            <FaQuestionCircle className="mobile-menu-icon" />
            <span>Help & Support</span>
          </Link>
          
          <Link to="/about" className="mobile-menu-link" onClick={handleLinkClick}>
            <FaInfoCircle className="mobile-menu-icon" />
            <span>About</span>
          </Link>
          
          <button 
            className="mobile-menu-link"
            onClick={handleLogout}
          >
            <FaSignOutAlt className="mobile-menu-icon" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
