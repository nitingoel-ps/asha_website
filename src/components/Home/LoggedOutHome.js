import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Container, Row, Col, Card, Form, Alert } from 'react-bootstrap';
import NeuralNetwork from './NeuralNetwork';
import './Home.css';
//import happyCoupleImage from '../../assets/images/happy_people.png';
//import happyCoupleImage from '../../assets/images/hero-consultation.jpg';
import happyCoupleImage from '../../assets/images/doc_office.png';
import { BsDatabase, BsChatDots, BsLightbulb, BsShare } from 'react-icons/bs';
import axiosInstance from '../../utils/axiosInstance';

// Cognito configuration only for waitlist
import { Amplify } from 'aws-amplify';
import { signUp } from 'aws-amplify/auth';  // Updated import
const waitlistConfig = {
  Auth: {
    Cognito: {
      region: 'us-east-1',
      userPoolId: 'us-east-1_oqESegkRi',
      userPoolClientId: '27rlvno93hn533psvrhabfh3cm',
    }
  }
};
Amplify.configure(waitlistConfig);

function LoggedOutHome() {
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const location = useLocation();

  useEffect(() => {
    // Handle both URL params and hash
    const params = new URLSearchParams(location.search);
    const hash = location.hash;

    // Handle waitlist param
    if (params.get('scrollTo') === 'waitlist') {
      const waitlistSection = document.querySelector('.waitlist-section');
      if (waitlistSection) {
        waitlistSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
    // Handle hash-based navigation (features and how-it-works)
    else if (hash) {
      const sectionId = hash.replace('#', '');
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const generateTempPassword = () => {
    // Generate a random password that meets Cognito requirements
    return Math.random().toString(36).slice(-8) + 'A1!';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Sign up the user with Cognito
      const { user } = await signUp({
        username: formData.email,
        password: generateTempPassword(), // Create a function to generate temp password
        attributes: {
          email: formData.email,
          name: formData.name,
        }
      });
      
      setSubmitSuccess(true);
      setSubmitError(null);
    } catch (error) {
      setSubmitError(error.message);
      setSubmitSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <NeuralNetwork />
        <Container>
          <Row>
            <Col lg={7} className="hero-content">
              <h1 className="hero-title fade-in">
                Your Health Data
                <span className="hero-subtitle">Powered by AI</span>
              </h1>
              <p className="hero-description fade-in">
                Consolidate your health records, get AI-powered insights, and take control 
                of your healthcare journey with our secure and intelligent platform.
              </p>
              <div className="hero-buttons fade-in">
                <Button variant="info" as={Link} to="/register" size="lg" style={{ backgroundColor: '#00CED1', borderColor: '#00CED1' }}>
                  Get Started
                </Button>
                <Button variant="outline-light" href="#features" size="lg">
                  Learn More
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
        <div className="hero-image-container">
          <div className="hero-image-overlay"></div>
          <img 
            src={happyCoupleImage}
            alt="Healthcare consultation"
            className="hero-image"
          />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <Container>
          <h2 className="text-center">Key Features</h2>
          <p className="subtitle">
            Experience healthcare reimagined with our AI-powered platform
          </p>
          <Row>
            <Col md={6} className="mb-4">
              <div className="feature-card slide-up">
                <div className="feature-header">
                  <div className="feature-icon-wrapper">
                    <BsDatabase className="feature-icon" />
                  </div>
                  <h3 className="feature-title">Secure Health Vault</h3>
                </div>
                <p className="feature-description">
                  Consolidate all your health records in one secure place with 
                  automatic imports from provider portals.
                </p>
              </div>
            </Col>
            <Col md={6} className="mb-4">
              <div className="feature-card slide-up">
                <div className="feature-header">
                  <div className="feature-icon-wrapper">
                    <BsChatDots className="feature-icon" />
                  </div>
                  <h3 className="feature-title">AI Voice Interface</h3>
                </div>
                <p className="feature-description">
                  Access your health data quickly through an intuitive voice chat 
                  interface.
                </p>
              </div>
            </Col>
            <Col md={6} className="mb-4">
              <div className="feature-card slide-up">
                <div className="feature-header">
                  <div className="feature-icon-wrapper">
                    <BsLightbulb className="feature-icon" />
                  </div>
                  <h3 className="feature-title">Smart Research</h3>
                </div>
                <p className="feature-description">
                  Get AI-powered insights based on your personal health context for 
                  informed medical discussions.
                </p>
              </div>
            </Col>
            <Col md={6} className="mb-4">
              <div className="feature-card slide-up">
                <div className="feature-header">
                  <div className="feature-icon-wrapper">
                    <BsShare className="feature-icon" />
                  </div>
                  <h3 className="feature-title">Secure Sharing</h3>
                </div>
                <p className="feature-description">
                  Share your health information securely with medical professionals for 
                  second opinions.
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works-section">
        <Container>
          <h2 className="text-center mb-5">How It Works</h2>
          <Row className="justify-content-center">
            <Col md={4} className="mb-4">
              <Card className="bg-dark text-white slide-up">
                <Card.Body className="text-center">
                  <div className="mb-3">
                    <i className="bi bi-1-circle display-4"></i>
                  </div>
                  <Card.Title>Connect Your Providers</Card.Title>
                  <Card.Text>
                    Easily link your healthcare providers and insurance companies to 
                    import your medical records.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-4">
              <Card className="bg-dark text-white slide-up">
                <Card.Body className="text-center">
                  <div className="mb-3">
                    <i className="bi bi-2-circle display-4"></i>
                  </div>
                  <Card.Title>Organize Your Data</Card.Title>
                  <Card.Text>
                    Your records are automatically organized and analyzed for easy access 
                    and understanding.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-4">
              <Card className="bg-dark text-white slide-up">
                <Card.Body className="text-center">
                  <div className="mb-3">
                    <i className="bi bi-3-circle display-4"></i>
                  </div>
                  <Card.Title>Get AI Insights</Card.Title>
                  <Card.Text>
                    Receive personalized health insights and recommendations based on 
                    your medical history.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Join Waitlist Section */}
      <section id="waitlist" className="waitlist-section">
        <Container className="text-center">
          <h1 className="display-4 mb-4">Join the Waitlist</h1>
          <p className="lead mb-5">
            Be among the first to experience the future of personal health management.
          </p>
          <Row className="justify-content-center">
            <Col md={6}>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Control
                    type="text"
                    placeholder="Name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    size="lg"
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Control
                    type="email"
                    placeholder="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    size="lg"
                  />
                </Form.Group>
                <Button 
                  variant="info" 
                  size="lg" 
                  type="submit"
                  className="px-5 w-100"
                  style={{ backgroundColor: '#00CED1', borderColor: '#00CED1' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Joining...' : 'Join Waitlist'}
                </Button>
              </Form>
              {submitSuccess && (
                <Alert variant="success" className="mt-3">
                  Thank you for joining our waitlist! We'll keep you updated on our progress.
                </Alert>
              )}
              {submitError && (
                <Alert variant="danger" className="mt-3">
                  {submitError}
                </Alert>
              )}
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
}

export default LoggedOutHome;