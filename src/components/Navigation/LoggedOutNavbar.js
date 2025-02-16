import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Nav, Container } from 'react-bootstrap';
import './Navigation.css';

function LoggedOutNavbar() {
  return (
    <Navbar variant="dark" expand="lg" className="site-navbar">
      <Container>
        <Navbar.Brand as={Link} to="/" className="text-white fw-bold">
          Aspen Health AI
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <Nav.Link href="#features">Features</Nav.Link>
            <Nav.Link href="#how-it-works">How It Works</Nav.Link>
            <Nav.Link as={Link} to="/register">Sign Up</Nav.Link>
            <Nav.Link as={Link} to="/login" className="ms-3">Login</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default LoggedOutNavbar; 