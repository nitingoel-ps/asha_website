import React from 'react';
import { Form, Button } from 'react-bootstrap';
import { FaUserPlus } from 'react-icons/fa';

function EmailPasswordStep({ formData, handleChange, handleNextStep, handleOpenTerms, isLoading }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    handleNextStep();
  };

  const isFormValid = () => {
    const { email, password, confirmPassword, agreedToTerms } = formData;
    
    // Basic validation rules
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailPattern.test(email);
    const isPasswordValid = password.length >= 8;
    const doPasswordsMatch = password === confirmPassword;
    
    return isEmailValid && isPasswordValid && doPasswordsMatch && agreedToTerms;
  };

  return (
    <div className="step-container">
      <div>
        <h2 className="step-heading">Create your account</h2>
        <p className="step-description">Enter your email address and create a password</p>
      </div>
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Email Address</Form.Label>
          <Form.Control
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            required
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            placeholder="Create a secure password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            required
          />
          <Form.Text className="form-hint">
            Password must be at least 8 characters long
          </Form.Text>
        </Form.Group>
        
        <Form.Group className="mb-4">
          <Form.Label>Confirm Password</Form.Label>
          <Form.Control
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            required
          />
          {formData.password && formData.confirmPassword && 
           formData.password !== formData.confirmPassword && (
            <Form.Text className="text-danger">
              Passwords do not match
            </Form.Text>
          )}
        </Form.Group>
        
        <Form.Group className="mb-4">
          <Form.Check
            type="checkbox"
            id="terms-checkbox"
            checked={formData.agreedToTerms}
            onChange={(e) => handleChange('agreedToTerms', e.target.checked)}
            label={
              <span className="form-check-label">
                I agree to the {' '}
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
                </a>
              </span>
            }
          />
        </Form.Group>
        
        <Button 
          variant="primary" 
          type="submit" 
          className="w-100 mb-3" 
          disabled={!isFormValid() || isLoading}
        >
          {isLoading ? 'Processing...' : 'Continue'}
        </Button>
        
        <div className="text-center">
          <span>Already have an account? </span>
          <a href="/login" className="text-link">Sign in</a>
        </div>
      </Form>
    </div>
  );
}

export default EmailPasswordStep; 