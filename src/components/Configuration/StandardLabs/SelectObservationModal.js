import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, ListGroup, Spinner } from 'react-bootstrap';
import axiosInstance from '../../../utils/axiosInstance';

function SelectObservationModal({ show, onHide, onSelect, excludeIds = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [observations, setObservations] = useState([]);
  const [filteredObservations, setFilteredObservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchObservations = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get('/admin/std-observations/');
        // Filter out observations that are already in the panel
        const filteredData = response.data.filter(obs => !excludeIds.includes(obs.id));
        setObservations(filteredData);
        setFilteredObservations(filteredData);
      } catch (err) {
        setError(err.message || 'Failed to load observations');
      }
      setLoading(false);
    };

    if (show) {
      fetchObservations();
    }
  }, [show, excludeIds]);

  useEffect(() => {
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      const filtered = observations.filter(obs => 
        (obs.name || '').toLowerCase().includes(searchTermLower) ||
        (obs.long_name || '').toLowerCase().includes(searchTermLower) ||
        (obs.loinc_code || '').toLowerCase().includes(searchTermLower)
      );
      setFilteredObservations(filtered);
    } else {
      setFilteredObservations(observations);
    }
  }, [searchTerm, observations]);

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Add Observation to Panel</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Control
            type="text"
            placeholder="Search observations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Form.Group>

        {loading ? (
          <div className="text-center">
            <Spinner animation="border" />
          </div>
        ) : (
          <ListGroup style={{ maxHeight: '400px', overflow: 'auto' }}>
            {filteredObservations.map(obs => (
              <ListGroup.Item
                key={obs.id}
                action
                onClick={() => onSelect(obs.id)}
                className="d-flex justify-content-between align-items-start"
              >
                <div>
                  <div className="fw-bold">{obs.name}</div>
                  <div className="text-muted small">{obs.long_name}</div>
                </div>
                <small className="text-muted">
                  LOINC: {obs.loinc_code || 'N/A'}
                </small>
              </ListGroup.Item>
            ))}
            {filteredObservations.length === 0 && (
              <ListGroup.Item>No matching observations found</ListGroup.Item>
            )}
          </ListGroup>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default SelectObservationModal;
