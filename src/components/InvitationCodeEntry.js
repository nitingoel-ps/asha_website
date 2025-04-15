import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { FaKey, FaArrowRight } from 'react-icons/fa';
import axiosInstance from '../utils/axiosInstance';

function InvitationCodeEntry() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsValidating(true);
    setError('');

    try {
      await axiosInstance.post('/validate/registration-code/', { code });
      
      // Always redirect to the new registration flow
      navigate(`/register?code=${code}`);
    } catch (error) {
      setError('Invalid invitation code. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const goToWaitlist = () => {
    navigate('/?scrollTo=waitlist');
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md={6}>
          <Card>
            <Card.Body className="text-center">
              <FaKey className="mb-4" size={40} color="#00a19a" />
              <h2 className="mb-4">Registration Code Required</h2>
              <p className="mb-4">
                Please enter your invitation code to register. If you don't have one,
                you can join <Button variant="link" className="p-0" onClick={goToWaitlist}>the waitlist</Button>.
              </p>
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4">
                  <Form.Control
                    type="text"
                    placeholder="Enter your invitation code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </Form.Group>
                
                {error && <Alert variant="danger">{error}</Alert>}
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="w-100"
                  disabled={isValidating}
                >
                  {isValidating ? 'Validating...' : (
                    <span>Continue <FaArrowRight className="ms-1" /></span>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default InvitationCodeEntry;
