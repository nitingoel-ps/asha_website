import React from 'react';
import { Button, Card } from 'react-bootstrap';
import { FaCheckCircle, FaSignInAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function SuccessStep({ email }) {
  const navigate = useNavigate();
  
  const handleGoToLogin = () => {
    navigate('/login');
  };
  
  return (
    <div className="step-container text-center">
      <div className="success-icon mb-4">
        <FaCheckCircle size={60} color="#28a745" />
      </div>
      
      <h2 className="step-heading">Account Created Successfully!</h2>
      <p className="step-description mb-4">
        Your account has been created with the email <strong>{email}</strong>.
        Please login to continue to your dashboard.
      </p>
      
      <Button 
        variant="primary" 
        size="lg" 
        className="d-flex align-items-center justify-content-center mx-auto"
        onClick={handleGoToLogin}
      >
        <FaSignInAlt className="me-2" />
        Go to Login
      </Button>
    </div>
  );
}

export default SuccessStep; 