import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

/**
 * Modal component for collecting additional feedback when a user selects "Not Helpful"
 */
const FeedbackModal = ({ show, onClose, onSubmit, isSubmitting }) => {
  const [additionalFeedback, setAdditionalFeedback] = useState('');

  const handleSubmit = () => {
    onSubmit(additionalFeedback);
    setAdditionalFeedback(''); // Clear the input after submission
  };

  return (
    <Modal show={show} onHide={onClose} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title as="h5">Help us improve</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-3">
          We're sorry the response wasn't helpful. Could you share why so we can improve?
        </p>
        <Form.Group>
          <Form.Control
            as="textarea"
            value={additionalFeedback}
            onChange={(e) => setAdditionalFeedback(e.target.value)}
            placeholder="What would have made this response more helpful?"
            rows={3}
            autoFocus
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button 
          variant="primary" 
          onClick={handleSubmit} 
          disabled={isSubmitting}
        >
          Send Feedback
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FeedbackModal; 