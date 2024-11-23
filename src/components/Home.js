// src/components/Home.js
import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Container, Navbar, Nav } from 'react-bootstrap';

function Home() {
  const isAuthenticated = localStorage.getItem('access_token') ? true : false;

  return (
    <>
      <Container fluid className="bg-light p-5 mb-4 rounded-3 text-center">
        <Container>
          <h1>Welcome to the Healthcare App</h1>
          <p>Your personal health data at your fingertips.</p>
          {isAuthenticated ? (
            <>
              <Button variant="primary" as={Link} to="/patient-dashboard">
                Go to Dashboard
              </Button><br/>
              <Button variant="primary" as={Link} to="/add-providers">
                Upload healthcare data Files
              </Button><br/>       
              <Button variant="primary" as={Link} to="/dashboard">
                Establish Connection with your healthcare provider.
              </Button>            
          </>
          ) : (
            <>
              <Button variant="primary" as={Link} to="/register" className="mr-2">
                Get Started
              </Button>
              <Button variant="outline-primary" as={Link} to="/login">
                Login
              </Button>
            </>
          )}
        </Container>
      </Container>
    </>
  );
}

export default Home;