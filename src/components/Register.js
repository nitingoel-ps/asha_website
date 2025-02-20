// src/components/Register.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance'; // Import axiosInstance
import { Form, Button, Container, Row, Col, Card, Alert } from 'react-bootstrap';
import { FaUserPlus } from 'react-icons/fa'; // Import icon

function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    password2: '',
    email: '',
    first_name: '',
    last_name: '',
    invitation_code: ''
  });

  const [isCodeValid, setIsCodeValid] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Extract invitation code from URL parameters
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    
    if (!code) {
      navigate('/registration');
      return;
    }

    setFormData(prev => ({ ...prev, invitation_code: code }));
    validateInvitationCode(code);
  }, [location]);

  const validateInvitationCode = (code) => {
    axiosInstance
      .post('/validate/registration-code/', { code })
      .then((response) => {
        setIsCodeValid(true);
        setErrors({});
      })
      .catch((error) => {
        setIsCodeValid(false);
        setErrors({ invitation_code: 'Invalid invitation code' });
        setTimeout(() => navigate('/'), 3000);
      });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isCodeValid) {
      setErrors({ invitation_code: 'Invalid invitation code' });
      return;
    }

    axiosInstance
      .post('/register/', formData)
      .then((response) => {
        setMessage('User registered successfully!');
        setErrors({});
      })
      .catch((error) => {
        if (error.response && error.response.data) {
          setErrors(error.response.data);
        } else {
          setErrors({ general: 'An error occurred. Please try again.' });
        }
      });
  };

  if (!isCodeValid) {
    return (
      <Container className="mt-5">
        <Alert variant="warning">
          Validating invitation code... {errors.invitation_code && <div>{errors.invitation_code}</div>}
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md="8">
          <Card>
            <Card.Body>
              <h2 className="mb-4 text-center">
                <FaUserPlus /> Register
              </h2>
              {message && <Alert variant="success">{message}</Alert>}
              {errors.general && <Alert variant="danger">{errors.general}</Alert>}
              <Form onSubmit={handleSubmit}>
                {/* Invitation Code */}
                <Form.Group controlId="invitation_code" className="mb-3">
                  <Form.Label>Invitation Code</Form.Label>
                  <Form.Control
                    type="text"
                    name="invitation_code"
                    value={formData.invitation_code}
                    disabled
                    className="bg-light"
                  />
                </Form.Group>
                
                {/* Username */}
                <Form.Group controlId="username" className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    isInvalid={!!errors.username}
                    placeholder="Choose a username"
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.username}
                  </Form.Control.Feedback>
                </Form.Group>
                {/* Password */}
                <Form.Group controlId="password" className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    isInvalid={!!errors.password}
                    placeholder="Enter a password"
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.password}
                  </Form.Control.Feedback>
                </Form.Group>
                {/* Confirm Password */}
                <Form.Group controlId="password2" className="mb-3">
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password2"
                    value={formData.password2}
                    onChange={handleChange}
                    isInvalid={!!errors.password2}
                    placeholder="Confirm your password"
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.password2}
                  </Form.Control.Feedback>
                </Form.Group>
                {/* Email */}
                <Form.Group controlId="email" className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    isInvalid={!!errors.email}
                    placeholder="Enter your email"
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email}
                  </Form.Control.Feedback>
                </Form.Group>
                {/* First Name */}
                <Form.Group controlId="first_name" className="mb-3">
                  <Form.Label>First Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Enter your first name"
                  />
                </Form.Group>
                {/* Last Name */}
                <Form.Group controlId="last_name" className="mb-4">
                  <Form.Label>Last Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Enter your last name"
                  />
                </Form.Group>
                {/* Submit Button */}
                <Button variant="primary" type="submit" className="w-100">
                  Register
                </Button>
              </Form>
            </Card.Body>
          </Card>
          <p className="mt-3 text-center">
            Already have an account? <a href="/login">Login here</a>
          </p>
        </Col>
      </Row>
    </Container>
  );
}

export default Register;