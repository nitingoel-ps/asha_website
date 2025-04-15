import React, { useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { FaEnvelope } from 'react-icons/fa';
import axiosInstance from '../../utils/axiosInstance';

function VerificationStep({ email, verificationCode, handleChange, handlePrevStep, handleNextStep, isLoading }) {
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendError, setResendError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    handleNextStep();
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setResendError('');
    
    try {
      // Use the same endpoint as the initial email verification
      await axiosInstance.post('/auth/check-email/', { email });
      
      // Start cooldown countdown
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (err) {
      console.error('Error resending code:', err);
      setResendError(err.response?.data?.error || 'Failed to resend code');
    }
  };

  return (
    <div className="step-container">
      <div>
        <h2 className="step-heading">Verify your email</h2>
        <p className="step-description">
          We've sent a 6-digit verification code to <strong>{email}</strong>
        </p>
      </div>
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-4">
          <Form.Label>Verification Code</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={(e) => handleChange(e.target.value)}
            maxLength={6}
            required
          />
        </Form.Group>
        
        <div className="text-center mb-4">
          {resendError && <p className="text-danger small mb-2">{resendError}</p>}
          <a 
            href="#" 
            className={`text-link ${resendCooldown > 0 ? 'text-muted' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              if (resendCooldown === 0) handleResendCode();
            }}
          >
            {resendCooldown > 0 
              ? `Resend code in ${resendCooldown}s` 
              : "Didn't receive a code? Resend"}
          </a>
        </div>
        
        <Row className="gx-2 mb-3">
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
              type="submit" 
              className="w-100" 
              disabled={verificationCode.length !== 6 || isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
}

export default VerificationStep; 