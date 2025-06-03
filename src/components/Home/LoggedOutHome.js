import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Container, Row, Col, Card, Form, Alert, Carousel } from 'react-bootstrap';
import NeuralNetwork from './NeuralNetwork';
import './Home.css';
//import happyCoupleImage from '../../assets/images/happy_people.png';
//import happyCoupleImage from '../../assets/images/hero-consultation.jpg';
import happyCoupleImage from '../../assets/images/doc_office.png';
import { BsDatabase, BsChatDots, BsLightbulb, BsShare, BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import axiosInstance from '../../utils/axiosInstance';

// Cognito configuration only for waitlist
import { Amplify } from 'aws-amplify';
import { signUp } from 'aws-amplify/auth';  // Updated import
// import { Modal } from 'react-bootstrap'; // No longer needed here
import { confirmSignUp } from 'aws-amplify/auth';  // Add this import
import VerificationModal from '../Common/VerificationModal'; // Import the new modal

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

// Custom hook for responsive carousel
const useResponsiveCarousel = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return isMobile;
};

function LoggedOutHome() {
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const isMobile = useResponsiveCarousel();

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


  // Code to handle registration signup with Cognito

  const generateTempPassword = () => {
    // Generate a random password that meets Cognito requirements
    return Math.random().toString(36).slice(-8) + 'A1!';
  };
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [verifying, setVerifying] = useState(false);

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
      
      setShowVerificationModal(true); // Show verification modal after successful signup
      setSubmitError(null);
    } catch (error) {
      setSubmitError(error.message);
      setSubmitSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  // Add verification handler
  const handleVerification = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setVerificationError('');

    try {
      await confirmSignUp({
        username: formData.email,
        confirmationCode: verificationCode
      });
      
      setShowVerificationModal(false);
      setSubmitSuccess(true);
    } catch (error) {
      setVerificationError(error.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <Container fluid>
          <Row>
            <Col lg={6} className="hero-content-wrapper">
              <div className="hero-content">
                <NeuralNetwork nodeCount={25} />
                <div className="hero-text">
                  <h1 className="hero-title fade-in">
                    Your Health Data
                    <span className="hero-subtitle">Powered by AI</span>
                  </h1>
                  <p className="hero-description fade-in">
                    Consolidate your health records, get AI-powered insights, and take control 
                    of your healthcare journey with our secure and intelligent platform.
                  </p>
                  <div className="hero-buttons fade-in">
                    <Button variant="info" as={Link} to="/login" size="lg" style={{ backgroundColor: '#019ea1', borderColor: '#019ea1' }}>
                      Get Started
                    </Button>
                    <Button variant="outline-light" href="#features" size="lg">
                      Learn More
                    </Button>
                  </div>
                </div>
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
          <div className="carousel-container">
            {isMobile ? (
              // Mobile Carousel - One card per slide
              <Carousel
                className="how-it-works-carousel mobile-carousel"
                indicators={true}
                interval={null}
                touch={true}
                prevIcon={<div className="carousel-nav-icon carousel-prev-icon"><BsChevronLeft /></div>}
                nextIcon={<div className="carousel-nav-icon carousel-next-icon"><BsChevronRight /></div>}
                fade={true}
              >
                {/* Card 1 */}
                <Carousel.Item>
                  <Card className="carousel-card" style={{ backgroundColor: '#2a2a2a' }}>
                    <Card.Body style={{ backgroundColor: '#2a2a2a' }}>
                      <div className="step-number">1</div>
                      <Card.Title>Consolidate Your Health Data</Card.Title>
                        <Card.Text>
                          <ul>
                            <li>Direct integrations with most health providers.</li>
                            <li>Consolidate data across providers.</li>
                            <li>Scan or upload documents.</li>
                          </ul>                      
                        </Card.Text>
                    </Card.Body>
                  </Card>
                </Carousel.Item>
                
                {/* Card 2 */}
                <Carousel.Item>
                  <Card className="carousel-card" style={{ backgroundColor: '#2a2a2a' }}>
                    <Card.Body style={{ backgroundColor: '#2a2a2a' }}>
                      <div className="step-number">2</div>
                      <Card.Title>AI-Powered Health Review</Card.Title>
                      <Card.Text>
                        <ul>
                            <li>Deep analysis of your health records.</li>
                            <li>Easy-to-understand summaries and actionable insights.</li>
                            <li>Compare your data against current guidelines.</li>
                          </ul>
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Carousel.Item>
                
                {/* Card 3 */}
                <Carousel.Item>
                  <Card className="carousel-card" style={{ backgroundColor: '#2a2a2a' }}>
                    <Card.Body style={{ backgroundColor: '#2a2a2a' }}>
                      <div className="step-number">3</div>
                      <Card.Title>Meet Asha, Your Voice Assistant</Card.Title>
                        <Card.Text>
                          <ul>
                            <li>Talk to her to find or explain anything in your records.</li>
                            <li>She can conduct health research on your behalf.</li>
                            <li>Use voice to navigate the app!</li>
                          </ul>                      
                        </Card.Text>
                    </Card.Body>
                  </Card>
                </Carousel.Item>
                
                {/* Card 4 */}
                <Carousel.Item>
                  <Card className="carousel-card" style={{ backgroundColor: '#2a2a2a' }}>
                    <Card.Body style={{ backgroundColor: '#2a2a2a' }}>
                      <div className="step-number">4</div>
                      <Card.Title>Log Your Health Journey</Card.Title>
                      <Card.Text>
                        <ul>
                          <li>Asha helps keep your health data current by easily updating medications, tracking vitals, and recording symptoms.</li>
                          <li>She can help set and track health goals with personalized guidance and support.</li>
                        </ul>
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Carousel.Item>
                
                {/* Card 5 */}
                <Carousel.Item>
                  <Card className="carousel-card" style={{ backgroundColor: '#2a2a2a' }}>
                    <Card.Body style={{ backgroundColor: '#2a2a2a' }}>
                      <div className="step-number">5</div>
                      <Card.Title>Secure Data Sharing</Card.Title>
                      <Card.Text>
                        <ul>
                          <li>Share your health information securely with healthcare providers for consultations or second opinions.</li>
                          <li>Control what you share and maintain a complete record of all your medical interactions.</li>
                        </ul>
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Carousel.Item>
                
                {/* Card 6 */}
                <Carousel.Item>
                  <Card className="carousel-card" style={{ backgroundColor: '#2a2a2a' }}>
                    <Card.Body style={{ backgroundColor: '#2a2a2a' }}>
                      <div className="step-number">6</div>
                      <Card.Title>Proactive Health Insights</Card.Title>
                      <Card.Text>
                        <ul>
                          <li>Receive personalized health recommendations and preventive care reminders based on your medical history and current health status.</li>
                          <li>Stay informed about your health journey.</li>
                        </ul>
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Carousel.Item>
              </Carousel>
            ) : (
              // Desktop Carousel - Three cards per slide
              <Carousel
                className="how-it-works-carousel desktop-carousel"
                indicators={true}
                interval={null}
                touch={true}
                prevIcon={<div className="carousel-nav-icon carousel-prev-icon"><BsChevronLeft /></div>}
                nextIcon={<div className="carousel-nav-icon carousel-next-icon"><BsChevronRight /></div>}
                slide={true}
              >
                {/* First Slide - Cards 1-3 */}
                <Carousel.Item>
                  <Row className="carousel-row">
                    <Col lg={4} md={4} className="carousel-col">
                      <Card className="carousel-card" style={{ backgroundColor: '#2a2a2a' }}>
                        <Card.Body style={{ backgroundColor: '#2a2a2a' }}>
                          <div className="step-number">1</div>
                          <Card.Title>Consolidate Your Health Data</Card.Title>
                          <Card.Text>
                          <ul>
                            <li>Direct integrations with most health providers.</li>
                            <li>Consolidate data across providers.</li>
                            <li>Scan or upload existing documents.</li>
                          </ul>
                          </Card.Text>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col lg={4} md={4} className="carousel-col">
                      <Card className="carousel-card" style={{ backgroundColor: '#2a2a2a' }}>
                        <Card.Body style={{ backgroundColor: '#2a2a2a' }}>
                          <div className="step-number">2</div>
                          <Card.Title>AI-Powered Health Review</Card.Title>
                          <Card.Text>
                          <ul>
                            <li>Deep analysis of your health records.</li>
                            <li>Easy-to-understand summaries and actionable insights.</li>
                            <li>Compare your data against current guidelines.</li>
                          </ul>
                          </Card.Text>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col lg={4} md={4} className="carousel-col">
                      <Card className="carousel-card" style={{ backgroundColor: '#2a2a2a' }}>
                        <Card.Body style={{ backgroundColor: '#2a2a2a' }}>
                          <div className="step-number">3</div>
                          <Card.Title>Meet Asha, Your Voice Assistant</Card.Title>
                          <Card.Text>
                            <ul>
                              <li>Talk to her to find or explain anything in your records.</li>
                              <li>She can conduct health research on your behalf.</li>
                              <li>Use voice to navigate the app!</li>
                            </ul>
                          </Card.Text>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Carousel.Item>
                
                {/* Second Slide - Cards 4-6 */}
                <Carousel.Item>
                  <Row className="carousel-row">
                    <Col lg={4} md={4} className="carousel-col">
                      <Card className="carousel-card" style={{ backgroundColor: '#2a2a2a' }}>
                        <Card.Body style={{ backgroundColor: '#2a2a2a' }}>
                          <div className="step-number">4</div>
                          <Card.Title>Log Your Health Journey</Card.Title>
                          <Card.Text>
                            <ul>
                              <li>Asha helps keep your health data current by easily updating medications, tracking vitals, and recording symptoms.</li>
                              <li>She can help set and track health goals with personalized guidance and support.</li>
                            </ul>
                          </Card.Text>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col lg={4} md={4} className="carousel-col">
                      <Card className="carousel-card" style={{ backgroundColor: '#2a2a2a' }}>
                        <Card.Body style={{ backgroundColor: '#2a2a2a' }}>
                          <div className="step-number">5</div>
                          <Card.Title>Secure Data Sharing</Card.Title>
                          <Card.Text>
                            <ul>
                              <li>Share your health information securely with healthcare providers for consultations or second opinions.</li>
                              <li>Control what you share and maintain a complete record of all your medical interactions.</li>
                            </ul>
                          </Card.Text>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col lg={4} md={4} className="carousel-col">
                      <Card className="carousel-card" style={{ backgroundColor: '#2a2a2a' }}>
                        <Card.Body style={{ backgroundColor: '#2a2a2a' }}>
                          <div className="step-number">6</div>
                          <Card.Title>Proactive Health Insights</Card.Title>
                          <Card.Text>
                            <ul>
                              <li>Receive personalized health recommendations and preventive care reminders based on your medical history and current health status.</li>
                              <li>Stay informed about your health journey.</li>
                            </ul>
                          </Card.Text>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Carousel.Item>
              </Carousel>
            )}
          </div>
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
                  style={{ backgroundColor: '#019ea1', borderColor: '#019ea1' }}
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
      <VerificationModal
        show={showVerificationModal}
        onHide={() => setShowVerificationModal(false)}
        verificationCode={verificationCode}
        setVerificationCode={setVerificationCode}
        onSubmit={handleVerification}
        verificationError={verificationError}
        verifying={verifying}
      />
    </div>
  );
}

export default LoggedOutHome;