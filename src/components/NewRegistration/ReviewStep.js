import React from 'react';
import { Button, Row, Col } from 'react-bootstrap';
import { FaCheck } from 'react-icons/fa';

function ReviewStep({ formData, handlePrevStep, handleSubmit, handleOpenTerms, isLoading }) {
  const { email, firstName, lastName, dateOfBirth } = formData;
  
  // Format date of birth for display (YYYY-MM-DD to MM/DD/YYYY)
  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    
    try {
      const [year, month, day] = dateString.split('-');
      return `${month}/${day}/${year}`;
    } catch (err) {
      return dateString;
    }
  };
  
  return (
    <div className="step-container">
      <div>
        <h2 className="step-heading">Review your information</h2>
        <p className="step-description">Please confirm your details before creating your account</p>
      </div>
      
      <div className="review-info">
        <div className="review-item">
          <div className="review-label">Email</div>
          <div className="review-value">{email}</div>
        </div>
        <div className="review-item">
          <div className="review-label">First Name</div>
          <div className="review-value">{firstName}</div>
        </div>
        <div className="review-item">
          <div className="review-label">Last Name</div>
          <div className="review-value">{lastName}</div>
        </div>
        <div className="review-item">
          <div className="review-label">Date of Birth</div>
          <div className="review-value">{formatDate(dateOfBirth)}</div>
        </div>
      </div>
      
      <div className="terms-reminder mb-4">
        <div className="terms-icon">✓</div>
        <p className="terms-text">
          By creating an account, you agree to our{' '}
          <a href="#" className="text-link" onClick={(e) => {
            e.preventDefault();
            handleOpenTerms('terms');
          }}>
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-link" onClick={(e) => {
            e.preventDefault();
            handleOpenTerms('privacy');
          }}>
            Privacy Policy
          </a>.
        </p>
      </div>
      
      <Row className="gx-2">
        <Col>
          <Button 
            variant="outline-secondary" 
            className="w-100" 
            onClick={handlePrevStep}
            disabled={isLoading}
          >
            Back
          </Button>
        </Col>
        <Col>
          <Button 
            variant="primary" 
            className="w-100" 
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </Col>
      </Row>
    </div>
  );
}

export default ReviewStep; 