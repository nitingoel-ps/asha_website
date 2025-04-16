import React from 'react';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useConnection } from '../../context/ConnectionContext';

const EmptyStateMessage = ({ section, className }) => {
  const { getEmptyStateMessage, connectionStatus, isLoading } = useConnection();
  
  if (isLoading) {
    return (
      <div className={`empty-state-container ${className || ''}`}>
        <div className="loading-spinner"></div>
        <p className="mt-3">Loading {section}...</p>
      </div>
    );
  }
  
  const emptyMessage = getEmptyStateMessage(section);
  
  return (
    <div className={`empty-state-container text-center p-4 ${className || ''}`}>
      {emptyMessage.heading && (
        <h4 className="mb-3">{emptyMessage.heading}</h4>
      )}
      <p className="text-muted mb-4">{emptyMessage.message}</p>
      {emptyMessage.action && (
        <Link to="/add-providers">
          <Button variant="primary">
            {emptyMessage.action}
          </Button>
        </Link>
      )}
    </div>
  );
};

export default EmptyStateMessage; 