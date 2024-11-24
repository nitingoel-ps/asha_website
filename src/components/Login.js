import React, { useState } from 'react';
import axiosInstance from '../utils/axiosInstance'; // Import axiosInstance
import { useNavigate } from 'react-router-dom';
import { Form, Button, Container, Row, Col, Card, Alert } from 'react-bootstrap';
import { FaUser } from 'react-icons/fa'; // Import the icon here
import { useAuth } from '../context/AuthContext'; // Import AuthContext

function Login() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });

  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, setUser } = useAuth(); // Get the login function and setUser from AuthContext

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Step 1: Authenticate and get tokens
      const response = await axiosInstance.post('/token/', credentials);
      const { access, refresh } = response.data;

      // Step 2: Save tokens to localStorage
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      // Step 3: Set Authorization header for future requests
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access}`;

      // Step 4: Fetch user details
      const userResponse = await axiosInstance.get('/user-context'); // Assuming `/user-context` returns user details
      const userDetails = userResponse.data;

      // Step 5: Update global authentication state
      setUser(userDetails); // Save user info in context
      login(); // Update the logged-in state

      // Step 6: Redirect
      setError('');
      navigate('/');
    } catch (error) {
      console.error("Login error:", error);
      setError('Invalid username or password');
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md="6">
          <Card>
            <Card.Body>
              <h2 className="mb-4 text-center"><FaUser /> Login</h2>
              {error && <Alert variant="danger">{error}</Alert>}
              <Form onSubmit={handleSubmit}>
                <Form.Group controlId="username" className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={credentials.username}
                    onChange={handleChange}
                    placeholder="Enter your username"
                    required
                  />
                </Form.Group>
                <Form.Group controlId="password" className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                  />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100">
                  Login
                </Button>
              </Form>
            </Card.Body>
          </Card>
          <p className="mt-3 text-center">
            Don't have an account? <a href="/register">Register here</a>
          </p>
        </Col>
      </Row>
    </Container>
  );
}

export default Login;