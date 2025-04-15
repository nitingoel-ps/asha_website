import React from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { FaUser } from 'react-icons/fa';

function ProfileInfoStep({ firstName, lastName, dateOfBirth, handleChange, handlePrevStep, handleNextStep, isLoading }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    handleNextStep();
  };

  const isFormValid = () => {
    return firstName.trim() !== '' && 
           lastName.trim() !== '' && 
           dateOfBirth.trim() !== '';
  };

  // Calculate max date (must be at least 18 years old)
  const calculateMaxDate = () => {
    const today = new Date();
    const eighteenYearsAgo = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate()
    );
    return eighteenYearsAgo.toISOString().split('T')[0];
  };

  // Calculate min date (must be under 120 years old)
  const calculateMinDate = () => {
    const today = new Date();
    const oneHundredTwentyYearsAgo = new Date(
      today.getFullYear() - 120,
      today.getMonth(),
      today.getDate()
    );
    return oneHundredTwentyYearsAgo.toISOString().split('T')[0];
  };

  return (
    <div className="step-container">
      <div>
        <h2 className="step-heading">Complete your profile</h2>
        <p className="step-description">Tell us a bit about yourself</p>
      </div>
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>First Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Your first name"
            value={firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            required
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Last Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Your last name"
            value={lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            required
          />
        </Form.Group>
        
        <Form.Group className="mb-4">
          <Form.Label>Date of Birth</Form.Label>
          <Form.Control
            type="date"
            value={dateOfBirth}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            max={calculateMaxDate()}
            min={calculateMinDate()}
            required
          />
          <Form.Text className="form-hint">
            You must be at least 18 years old to use this service
          </Form.Text>
        </Form.Group>
        
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
              disabled={!isFormValid() || isLoading}
            >
              {isLoading ? 'Processing...' : 'Continue'}
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
}

export default ProfileInfoStep; 