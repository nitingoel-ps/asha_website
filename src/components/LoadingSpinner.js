import React from 'react';
import { Spinner, Container } from 'react-bootstrap';

function LoadingSpinner() {
  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
      <Spinner animation="border" role="status" variant="primary">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </Container>
  );
}

export default LoadingSpinner;
