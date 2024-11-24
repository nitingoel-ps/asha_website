import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Container, Row, Col, Card } from 'react-bootstrap';
import '../Home.css'; // Add custom styling for Home page
import happyCoupleImage from '../../assets/images/happy_people.png'; // Adjust path based on where you save the image

function LoggedOutHome() {
  const isAuthenticated = localStorage.getItem('access_token') ? true : false;

  return (
    <Container className="home-container">
      <Row className="align-items-center">
        <Col md={6} className="text-center text-md-start">
          <h1>Welcome to My Health 360</h1>
          <p className="lead">
            Manage and Organize all of your Medical Records in one place effortlessly!
            We will help you get your data from Health providers as well as your insurance providers.
            
          </p>
            <>
              <Button variant="primary" as={Link} to="/register" className="me-2">
                Get Started
              </Button>
              <Button variant="outline-primary" as={Link} to="/login">
                Login
              </Button>
            </>
        </Col>
        <Col md={6} className="text-center">
          <img
            src={happyCoupleImage}
            alt="Happy users"
            className="img-fluid rounded shadow"
          />
        </Col>
      </Row>

      <Row className="mt-5 text-center why-choose-us">
        <h2 className="mb-4">Why Choose Us?</h2>
        <Col md={3} sm={6} className="mb-4">
          <div className="why-choose-item">
            <i className="bi bi-people-fill display-4 text-primary mb-3"></i>
            <h5>Connect to Your Health Providers</h5>
            <p>We make it easy for you to connect with all of your health providers in one portal and organize all your health data in one secure place!</p>
          </div>
        </Col>
        <Col md={3} sm={6} className="mb-4">
          <div className="why-choose-item">
            <i className="bi bi-wallet2 display-4 text-info mb-3"></i>
            <h5>Care & Insurance Together</h5>
            <p>We help you link your insurance claims and payments with the care provided, so you have a single 360-degree view.</p>
          </div>
        </Col>
        <Col md={3} sm={6} className="mb-4">
          <div className="why-choose-item">
            <i className="bi bi-shield-lock-fill display-4 text-success mb-3"></i>
            <h5>Security & Privacy</h5>
            <p>Your health data is secured in your Private Health Vault!</p>
          </div>
        </Col>
        <Col md={3} sm={6} className="mb-4">
          <div className="why-choose-item">
            <i className="bi bi-robot display-4 text-danger mb-3"></i>
            <h5>Powered by AI</h5>
            <p>Leverage the power of AI to learn more about your health.</p>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default LoggedOutHome;