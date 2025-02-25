import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosInstance';
import './ManageStandardPanels.css';

function ManageStandardPanels() {
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPanel, setEditingPanel] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    long_name: '',
    loinc_code: ''
  });

  const fetchPanels = async () => {
    try {
      const response = await axiosInstance.get('/admin/std-panels/');
      setPanels(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to load standard panels');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPanels();
  }, []);

  const handleClose = () => {
    setShowModal(false);
    setEditingPanel(null);
    setFormData({ name: '', long_name: '', loinc_code: '' });
  };

  const handleShow = (panel = null) => {
    if (panel) {
      setEditingPanel(panel);
      setFormData({
        name: panel.name,
        long_name: panel.long_name,
        loinc_code: panel.loinc_code
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPanel) {
        await axiosInstance.put(`/admin/std-panels/${editingPanel.id}/`, formData);
      } else {
        await axiosInstance.post('/admin/std-panels/', formData);
      }
      fetchPanels();
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to save panel');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this panel?')) {
      try {
        await axiosInstance.delete(`/admin/std-panels/${id}/`);
        fetchPanels();
      } catch (err) {
        setError(err.message || 'Failed to delete panel');
      }
    }
  };

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="standard-panels-container">
      <div className="header-container">
        <h2>Standard Panels</h2>
        <Button variant="primary" onClick={() => handleShow()}>Add New Panel</Button>
      </div>

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Name</th>
            <th>Long Name</th>
            <th>LOINC Code</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {panels.map((panel) => (
            <tr key={panel.id}>
              <td>
                <Link to={`/configuration/manage-standard-panels/${panel.id}`}>
                  {panel.name}
                </Link>
              </td>
              <td>{panel.long_name}</td>
              <td>{panel.loinc_code}</td>
              <td>
                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShow(panel)}>
                  Edit
                </Button>
                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(panel.id)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{editingPanel ? 'Edit Panel' : 'Add New Panel'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Long Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.long_name}
                onChange={(e) => setFormData({...formData, long_name: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>LOINC Code</Form.Label>
              <Form.Control
                type="text"
                value={formData.loinc_code}
                onChange={(e) => setFormData({...formData, loinc_code: e.target.value})}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" type="submit">Save</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

export default ManageStandardPanels;
