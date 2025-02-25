import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, ListGroup, Spinner, Alert } from 'react-bootstrap';
import axiosInstance from '../../../utils/axiosInstance';

function MapStandardModal({ show, onHide, onSave, selectedObservations }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [standardLabs, setStandardLabs] = useState([]);
  const [filteredLabs, setFilteredLabs] = useState([]);
  const [selectedLab, setSelectedLab] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchStandardLabs = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get('/admin/std-observations/');
        setStandardLabs(response.data);
        setFilteredLabs(response.data);
      } catch (err) {
        setError('Failed to load standard labs');
      }
      setLoading(false);
    };

    if (show) {
      fetchStandardLabs();
    }
  }, [show]);

  useEffect(() => {
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      const filtered = standardLabs.filter(lab => 
        (lab.name || '').toLowerCase().includes(searchTermLower) ||
        (lab.long_name || '').toLowerCase().includes(searchTermLower) ||
        (lab.loinc_code || '').toLowerCase().includes(searchTermLower)
      );
      setFilteredLabs(filtered);
    } else {
      setFilteredLabs(standardLabs);
    }
  }, [searchTerm, standardLabs]);

  const handleSave = async () => {
    if (!selectedLab) return;
    
    setSaving(true);
    try {
      const mappings = selectedObservations.map(observation => ({
        provider_id: observation.provider_id,
        observation_name: observation.observation_name,
        observation_loinc_code: observation.observation_loinc_code,
        report_name: observation.report_name,
        standard_observation_id: selectedLab.id
      }));
      
      await axiosInstance.post('/admin/mappings/', mappings);
      onSave();
    } catch (err) {
      setError('Failed to create mappings');
      console.error('Mapping error:', err);
    }
    setSaving(false);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Map to Standard Lab</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form.Group className="mb-3">
          <Form.Label>Search Standard Labs</Form.Label>
          <Form.Control
            type="text"
            placeholder="Search by name, long name, or LOINC code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Form.Group>

        {loading ? (
          <div className="text-center">
            <Spinner animation="border" />
          </div>
        ) : (
          <ListGroup className="standard-labs-list">
            {filteredLabs.map(lab => (
              <ListGroup.Item
                key={lab.id}
                active={selectedLab?.id === lab.id}
                onClick={() => setSelectedLab(lab)}
                className="d-flex justify-content-between align-items-start"
              >
                <div>
                  <div className="fw-bold">{lab.name}</div>
                  <div className="text-muted small">{lab.long_name}</div>
                </div>
                <div className="text-muted small">
                  LOINC: {lab.loinc_code || 'N/A'}
                </div>
              </ListGroup.Item>
            ))}
            {filteredLabs.length === 0 && (
              <ListGroup.Item>No matching standard labs found</ListGroup.Item>
            )}
          </ListGroup>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button 
          variant="primary" 
          onClick={handleSave}
          disabled={!selectedLab || saving}
        >
          {saving ? 'Saving...' : 'Map Selected'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default MapStandardModal;
