// src/components/Home.js
import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Container, Navbar, Nav } from 'react-bootstrap';

function Home() {
  const isAuthenticated = localStorage.getItem('access_token') ? true : false;

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.reload();
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Navbar.Brand href="/">Healthcare App</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ml-auto">
            {isAuthenticated ? (
              <>
                <Nav.Link as={Link} to="/dashboard">
                  Dashboard
                </Nav.Link>
                <Nav.Link href="#" onClick={handleLogout}>
                  Logout
                </Nav.Link>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/register">
                  Register
                </Nav.Link>
                <Nav.Link as={Link} to="/login">
                  Login
                </Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <Container fluid className="bg-light p-5 mb-4 rounded-3 text-center">
        <Container>
          <h1>Welcome to the Healthcare App</h1>
          <p>Your personal health data at your fingertips.</p>
          {isAuthenticated ? (
            <Button variant="primary" as={Link} to="/dashboard">
              Go to Dashboard
            </Button>
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