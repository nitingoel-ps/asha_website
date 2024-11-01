// src/components/Dashboard.js
import React, { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Button, Navbar, Nav } from 'react-bootstrap';

function Dashboard() {
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    axiosInstance
      .get('/welcome/')
      .then((response) => {
        setMessage(response.data.message);
      })
      .catch((error) => {
        console.error(error);
        navigate('/login');
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete axiosInstance.defaults.headers.common['Authorization'];
    navigate('/login');
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Navbar.Brand href="/dashboard">Healthcare App</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ml-auto">
            <Nav.Link href="#" onClick={handleLogout}>
              Logout
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <Container className="mt-5">
        <h2 className="mb-4">Dashboard</h2>
        <Card className="mb-3">
          <Card.Body>
            <Card.Title>Welcome Message</Card.Title>
            <Card.Text>{message ? message : 'Loading...'}</Card.Text>
          </Card.Body>
        </Card>
        {/* Additional Cards or Content */}
        <Card>
          <Card.Body>
            <Card.Title>Your Health Data</Card.Title>
            <Card.Text>
              {/* Placeholder content */}
              Here you can access and manage your health data.
            </Card.Text>
            <Button variant="primary">View Details</Button>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
}

export default Dashboard;