import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Image } from 'react-bootstrap';
import { FaTimes, FaHome, FaTachometerAlt, FaPlusCircle, FaRobot, FaCog, FaSignOutAlt } from 'react-icons/fa';
import './navbar.css';

const MobileMenu = ({ show, onClose, user, onLogout }) => {
  const menuRef = useRef(null);
  
  // Adjust menu position on show
  useEffect(() => {
    if (show && menuRef.current) {
      // Calculate menu height and position it properly
      const menuHeight = menuRef.current.offsetHeight;
      const windowHeight = window.innerHeight;
      
      if (menuHeight < windowHeight - 40) {
        // If menu is shorter than available space, center it vertically
        menuRef.current.style.top = `${Math.max(20, (windowHeight - menuHeight) / 2)}px`;
      } else {
        // Otherwise, place it at the top with some margin
        menuRef.current.style.top = '20px';
      }
    }
  }, [show, user]);
  
  // Get display name
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

  const handleLinkClick = () => {
    onClose();
  };

  const handleLogout = () => {
    onClose();
    onLogout();
  };

  return (
    <>
      <div 
        className={`mobile-menu-backdrop ${show ? 'show' : ''}`} 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div 
        ref={menuRef}
        className={`mobile-slide-menu ${show ? 'show' : ''}`} 
        style={{
          right: show ? '0' : '-100%'
        }}
      >
        <div className="mobile-menu-header">
          <Link to="/" onClick={handleLinkClick} className="text-decoration-none">
            <h5 className="mb-0 text-dark">Aspen Health AI</h5>
          </Link>
          <button 
            className="mobile-menu-close" 
            onClick={onClose} 
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </div>
        
        {user && (
          <div className="mobile-user-profile">
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
            <div className="ms-3">
              <h6 className="mb-0">{displayName}</h6>
              {user?.email && <small className="text-muted">{user.email}</small>}
            </div>
          </div>
        )}
        
        <ul className="mobile-menu-items">
          <li className="mobile-menu-item">
            <Link to="/patient-dashboard" className="mobile-menu-link" onClick={handleLinkClick}>
              <FaTachometerAlt className="mobile-menu-icon" />
              <span>Health Records</span>
            </Link>
          </li>
          <li className="mobile-menu-item">
            <Link to="/add-health-data" className="mobile-menu-link" onClick={handleLinkClick}>
              <FaPlusCircle className="mobile-menu-icon" />
              <span>Add Health Data</span>
            </Link>
          </li>
          <li className="mobile-menu-item">
            <Link to="/ai-chat" className="mobile-menu-link" onClick={handleLinkClick}>
              <FaRobot className="mobile-menu-icon" />
              <span>Talk to AI</span>
            </Link>
          </li>
          
          <li className="mobile-menu-divider"></li>
          
          <li className="mobile-menu-item">
            <Link to="/configuration" className="mobile-menu-link" onClick={handleLinkClick}>
              <FaCog className="mobile-menu-icon" />
              <span>Configuration</span>
            </Link>
          </li>
          <li className="mobile-menu-item">
            <button 
              className="mobile-menu-link w-100 text-start border-0 bg-transparent"
              onClick={handleLogout}
            >
              <FaSignOutAlt className="mobile-menu-icon" />
              <span>Logout</span>
            </button>
          </li>
        </ul>
        
        <div className="mobile-menu-footer">
          <small>© 2023 Aspen Health AI</small>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
