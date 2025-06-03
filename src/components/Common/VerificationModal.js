import React from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';

const VerificationModal = ({
  show,
  onHide,
  verificationCode,
  setVerificationCode,
  onSubmit,
  verificationError,
  verifying
}) => (
  <Modal show={show} onHide={onHide} centered>
    <Modal.Header closeButton>
      <Modal.Title>Verify Your Email</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <p>Please check your email for a verification code and enter it below.</p>
      <Form onSubmit={onSubmit}>
        <Form.Group className="mb-3">
          <Form.Control
            type="text"
            placeholder="Enter verification code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            required
          />
        </Form.Group>
        {verificationError && (
          <Alert variant="danger" className="mb-3">
            {verificationError}
          </Alert>
        )}
        <Button
          type="submit"
          variant="info"
          style={{ backgroundColor: '#019ea1', borderColor: '#019ea1' }}
          disabled={verifying}
          className="w-100"
        >
          {verifying ? 'Verifying...' : 'Verify Email'}
        </Button>
      </Form>
    </Modal.Body>
  </Modal>
);

export default VerificationModal; 