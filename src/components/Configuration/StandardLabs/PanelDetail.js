import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Button, Alert, Spinner } from 'react-bootstrap';
import axiosInstance from '../../../utils/axiosInstance';
import SelectObservationModal from './SelectObservationModal';
import './PanelDetail.css';

function PanelDetail() {
  const { panelId } = useParams();
  const navigate = useNavigate();
  const [panel, setPanel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchPanelDetail = async () => {
    try {
      const response = await axiosInstance.get(`/admin/std-panels/${panelId}/`);
      setPanel(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to load panel details');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPanelDetail();
  }, [panelId]);

  const handleAddObservation = async (observationId) => {
    try {
      await axiosInstance.post(`/admin/panels/${panelId}/observations/`, {
        observation_id: observationId
      });
      fetchPanelDetail();
      setShowModal(false);
    } catch (err) {
      setError(err.message || 'Failed to add observation to panel');
    }
  };

  const handleRemoveObservation = async (observationId) => {
    if (window.confirm('Are you sure you want to remove this observation from the panel?')) {
      try {
        await axiosInstance.delete(`/admin/panels/${panelId}/observations/${observationId}/`);
        fetchPanelDetail();
      } catch (err) {
        setError(err.message || 'Failed to remove observation from panel');
      }
    }
  };

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!panel) return <Alert variant="warning">Panel not found</Alert>;

  // Sort observations by name
  const sortedObservations = [...(panel.observations || [])].sort((a, b) => 
    (a.name || '').localeCompare(b.name || '')
  );

  return (
    <div className="panel-detail-container">
      <div className="header-container">
        <div>
          <Button 
            variant="outline-secondary" 
            onClick={() => navigate('/configuration/manage-standard-panels')}
            className="me-3"
          >
            ← Back
          </Button>
          <h2 className="d-inline-block">{panel.name}</h2>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          Add Observation
        </Button>
      </div>

      <div className="panel-info mb-4">
        <p><strong>Long Name:</strong> {panel.long_name}</p>
        <p><strong>LOINC Code:</strong> {panel.loinc_code || 'N/A'}</p>
      </div>

      <div className="panel-content">
        <h4>Panel Observations</h4>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Name</th>
              <th>Long Name</th>
              <th>LOINC Code</th>
              <th>Unit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedObservations.map((obs) => (
              <tr key={obs.id}>
                <td>{obs.name}</td>
                <td>{obs.long_name}</td>
                <td>{obs.loinc_code}</td>
                <td>{obs.uom}</td>
                <td>
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => handleRemoveObservation(obs.id)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
            {(!sortedObservations.length) && (
              <tr>
                <td colSpan="5" className="text-center">No observations in this panel</td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <SelectObservationModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSelect={handleAddObservation}
        excludeIds={sortedObservations.map(obs => obs.id) || []}
      />
    </div>
  );
}

export default PanelDetail;
