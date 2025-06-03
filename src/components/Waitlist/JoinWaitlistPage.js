import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Alert, Card } from 'react-bootstrap';
import { Amplify } from 'aws-amplify';
import { signUp, confirmSignUp } from 'aws-amplify/auth';
import VerificationModal from '../Common/VerificationModal';
import './JoinWaitlistPage.css'; // We'll create this for specific styles

// Cognito configuration for waitlist (same as in LoggedOutHome)
// Consider moving this to a central Amplify configuration if not already done
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

function JoinWaitlistPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const generateTempPassword = () => {
    return Math.random().toString(36).slice(-8) + 'A1!'; // Simple temporary password
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);
    try {
      await signUp({
        username: formData.email,
        password: generateTempPassword(),
        attributes: {
          email: formData.email,
          name: formData.name,
        }
      });
      setShowVerificationModal(true);
      setSubmitError(null);
    } catch (error) {
      setSubmitError(error.message);
      setSubmitSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

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
      setFormData({ name: '', email: '' }); // Clear form on success
    } catch (error) {
      setVerificationError(error.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Container className="join-waitlist-container py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="p-4 shadow-sm">
            <Card.Body>
              <h1 className="text-center mb-4">Join Our Waitlist</h1>
              <p className="text-center text-muted mb-4">
                Be among the first to experience Asha AI. Sign up to get an invitation. No credit card required.
              </p>
              {submitSuccess ? (
                <Alert variant="success">
                  Thank you for joining! Please check your email to verify your address and complete the process.
                  Once verified, we'll keep you updated on our progress.
                </Alert>
              ) : (
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3" controlId="waitlistName">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter your name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      size="lg"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4" controlId="waitlistEmail">
                    <Form.Label>Email address</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="Enter your email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      size="lg"
                    />
                  </Form.Group>

                  {submitError && (
                    <Alert variant="danger" className="mb-3">
                      {submitError}
                    </Alert>
                  )}

                  <Button
                    variant="info"
                    size="lg"
                    type="submit"
                    className="w-100 main-cta-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Request an Invite'}
                  </Button>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <VerificationModal
        show={showVerificationModal}
        onHide={() => setShowVerificationModal(false)}
        verificationCode={verificationCode}
        setVerificationCode={setVerificationCode}
        onSubmit={handleVerification}
        verificationError={verificationError}
        verifying={verifying}
      />
    </Container>
  );
}

export default JoinWaitlistPage; 