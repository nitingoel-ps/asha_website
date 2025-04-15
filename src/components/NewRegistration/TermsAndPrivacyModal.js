import React from 'react';
import { Modal, Button } from 'react-bootstrap';

function TermsAndPrivacyModal({ show, onHide, content, title }) {
  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      aria-labelledby="terms-modal-title"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="terms-modal-title">
          {title || 'Terms & Privacy'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="terms-content" dangerouslySetInnerHTML={{ __html: content }} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default TermsAndPrivacyModal; 