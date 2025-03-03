import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Renders a reference as a clickable link
 */
const EvidenceWithReferences = ({ text }) => {
  // Handle null or undefined text
  if (!text) {
    return null;
  }
  
  // If text already contains brackets, use it directly
  const reference = text.includes('[') ? text : `[${text}]`;
  
  // Convert StdLab/xxx to observation/xxx
  const getUrl = () => {
    const cleanReference = text.replace(/[\[\]"]/g, '');
    
    if (cleanReference.startsWith('StdLab/')) {
      return `/patient-dashboard/observation/${cleanReference.replace('StdLab/', '')}`;
    }
    
    return `/patient-dashboard/${cleanReference}`;
  };
  
  // Display the reference without brackets
  const displayText = text.replace(/[\[\]"]/g, '');
  
  return (
    <Link 
      to={getUrl()}
      className="evidence-reference-link"
      title="Click to view this record"
    >
      {displayText}
    </Link>
  );
};

export default EvidenceWithReferences;
