import React from 'react';
import { NavDropdown, Image } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaCog, FaSignOutAlt } from 'react-icons/fa';
import './navbar.css';

function UserDropdown({ user, handleLogout, closeMenu, windowWidth }) {
  // Get display name for the user
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
      menuVariant={windowWidth < 992 ? "dark" : "light"}
    >
      <NavDropdown.Item as={Link} to="/configuration" onClick={closeMenu}>
        <FaCog className="nav-icon" /> Configuration
      </NavDropdown.Item>
      <NavDropdown.Divider />
      <NavDropdown.Item onClick={() => { closeMenu(); handleLogout(); }}>
        <FaSignOutAlt className="nav-icon" /> Logout
      </NavDropdown.Item>
    </NavDropdown>
  );
}

export default UserDropdown;
