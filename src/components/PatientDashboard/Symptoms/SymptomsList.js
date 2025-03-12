import React, { useState } from 'react';
import { Card, Button, Row, Col, Badge, Modal, Form, Alert } from 'react-bootstrap';
import { Plus, Activity, Edit2, MapPin, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistance } from 'date-fns';
import axiosInstance from '../../../utils/axiosInstance';
import './Symptoms.css';

const SymptomsList = ({ symptoms = [], onRefresh }) => {
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [deleteInfo, setDeleteInfo] = useState({ logs: 0 });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    body_location: '',
    priority_order: '',
    common_triggers: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  
  // Suggested body locations for dropdown
  const suggestedBodyLocations = [
    'Head',
    'Chest',
    'Abdomen',
    'Back',
    'Arms',
    'Legs',
    'Joints',
    'Skin',
    'Throat',
    'General/Systemic'
  ];

  // Priority values for dropdown
  const priorityValues = Array.from({ length: 10 }, (_, i) => i + 1);

  const handleCreateSymptom = () => {
    navigate('create');
  };

  const handleViewSymptom = (symptomId) => {
    navigate(`${symptomId}`);
  };

  const handleEditClick = (e, symptom) => {
    e.stopPropagation();
    setSelectedSymptom(symptom);
    setFormData({
      name: symptom.name || '',
      description: symptom.description || '',
      body_location: symptom.body_location || '',
      priority_order: symptom.priority_order || 5,
      common_triggers: symptom.common_triggers || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = async (e, symptom) => {
    e.stopPropagation();
    setSelectedSymptom(symptom);
    
    // Check if there are any logs for this symptom
    try {
      const response = await axiosInstance.get(`/symptom-logs/?symptom_id=${symptom.id}`);
      console.log('Delete check response:', response.data);
      
      // Updated to handle the new API response format
      const logs = response.data.symptom_logs || [];
      
      setDeleteInfo({
        logs: logs.length,
        name: symptom.name
      });
      
      setShowDeleteModal(true);
    } catch (err) {
      console.error('Error checking symptom logs:', err);
      alert('Failed to check if symptom has any logs. Please try again.');
    }
  };

  const confirmDeleteSymptom = async () => {
    if (!selectedSymptom) return;
    
    // If symptom has logs, don't attempt deletion
    if (deleteInfo.logs > 0) {
      // Navigate to symptom detail page instead
      setShowDeleteModal(false);
      navigate(`${selectedSymptom.id}`);
      return;
    }
    
    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/symptoms/${selectedSymptom.id}/`);
      onRefresh();
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Error deleting symptom:', err);
      setError('Failed to delete symptom. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedSymptom(null);
    setError(null);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedSymptom(null);
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!selectedSymptom) return;
    
    setIsSubmitting(true);
    try {
      // Convert priority_order to number
      const updatedData = {
        ...formData,
        priority_order: parseInt(formData.priority_order)
      };
      
      const response = await axiosInstance.put(`/symptoms/${selectedSymptom.id}/`, updatedData);
      console.log('Update symptom response:', response.data);
      
      onRefresh();
      handleCloseEditModal();
    } catch (err) {
      console.error('Error updating symptom:', err);
      setError('Failed to update symptom. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Make sure symptoms is an array before using reduce
  const symptomArray = Array.isArray(symptoms) ? symptoms : [];

  // Group symptoms by body_location
  const groupedSymptoms = symptomArray.reduce((acc, symptom) => {
    const location = symptom.body_location || 'Other';
    if (!acc[location]) {
      acc[location] = [];
    }
    acc[location].push(symptom);
    return acc;
  }, {});

  // Sort symptoms by priority_order within each group
  Object.keys(groupedSymptoms).forEach(location => {
    groupedSymptoms[location].sort((a, b) => 
      (a.priority_order || 5) - (b.priority_order || 5)
    );
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 symptom-detail-header">
        <h2 className="mb-0">
          <Activity size={24} className="me-2" />
          Symptom Tracking
        </h2>
        <Button 
          variant="primary" 
          onClick={handleCreateSymptom}
        >
          <Plus size={16} className="me-1" />
          New Symptom
        </Button>
      </div>

      {symptomArray.length === 0 ? (
        <Card className="text-center p-4 mb-3 empty-state-container">
          <Card.Body>
            <h5>No symptoms tracked yet</h5>
            <p className="text-muted">
              Start tracking your symptoms to better manage your health.
            </p>
            <Button 
              variant="primary" 
              onClick={handleCreateSymptom}
            >
              <Plus size={16} className="me-1" />
              Track Your First Symptom
            </Button>
          </Card.Body>
        </Card>
      ) : (
        Object.entries(groupedSymptoms).map(([location, locationSymptoms]) => (
          <div key={location} className="mb-4">
            <h4 className="mb-3 d-flex align-items-center">
              <MapPin size={18} className="me-2 text-primary" />
              {location}
            </h4>
            <Row xs={1} md={2} className="g-3">
              {locationSymptoms.map(symptom => (
                <Col key={symptom.id}>
                  <Card 
                    className="h-100 symptom-card clickable-card" 
                    onClick={() => handleViewSymptom(symptom.id)}
                  >
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start">
                        <Card.Title className="mb-2">
                          {symptom.name}
                        </Card.Title>
                        <div className="d-flex align-items-center">
                          {symptom.latest_log && (
                            <Badge 
                              bg={symptom.latest_log.severity >= 4 ? "danger" : 
                                 symptom.latest_log.severity >= 3 ? "warning" : "info"}
                              className="me-2"
                            >
                              {symptom.latest_log.severity_label}
                            </Badge>
                          )}
                          <Button 
                            variant="light" 
                            size="sm" 
                            className="edit-button me-1"
                            onClick={(e) => handleEditClick(e, symptom)}
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button 
                            variant="light" 
                            size="sm" 
                            className="delete-button"
                            onClick={(e) => handleDeleteClick(e, symptom)}
                          >
                            <Trash2 size={16} className="text-danger" />
                          </Button>
                        </div>
                      </div>
                      
                      {symptom.description && (
                        <Card.Text className="text-muted mb-3">
                          {symptom.description.length > 100 
                            ? `${symptom.description.substring(0, 100)}...` 
                            : symptom.description}
                        </Card.Text>
                      )}
                      
                      {symptom.latest_log && (
                        <div className="mt-auto">
                          <small className="text-muted d-block mt-2">
                            Last tracked: {formatDistance(
                              new Date(symptom.latest_log.onset_time), 
                              new Date(), 
                              { addSuffix: true }
                            )}
                          </small>
                        </div>
                      )}
                      
                      <div className="card-overlay-hint">
                        <span>View Details</span>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        ))
      )}

      {/* Edit Symptom Modal */}
      <Modal show={showEditModal} onHide={handleCloseEditModal}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Symptom</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}
          
          <Form onSubmit={handleSubmitEdit}>
            <Form.Group className="mb-3">
              <Form.Label>Symptom Name*</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Body Location</Form.Label>
                  <Form.Select
                    name="body_location"
                    value={formData.body_location}
                    onChange={handleInputChange}
                  >
                    <option value="">Select location (optional)</option>
                    {suggestedBodyLocations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Priority (for sorting)</Form.Label>
                  <Form.Select
                    name="priority_order"
                    value={formData.priority_order}
                    onChange={handleInputChange}
                  >
                    {priorityValues.map(value => (
                      <option key={value} value={value}>
                        {value} {value === 1 ? '(Highest)' : value === 10 ? '(Lowest)' : ''}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Higher priority symptoms will appear first in lists
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the symptom (optional)"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Common Triggers</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="common_triggers"
                value={formData.common_triggers}
                onChange={handleInputChange}
                placeholder="List any known triggers (optional)"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseEditModal}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmitEdit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {deleteInfo.logs > 0 ? 'Cannot Delete Symptom' : 'Confirm Delete'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-4">
            <AlertTriangle size={48} className={deleteInfo.logs > 0 ? "text-warning mb-3" : "text-danger mb-3"} />
            <h5>{deleteInfo.logs > 0 
              ? `Cannot delete "${deleteInfo.name}"`
              : `Are you sure you want to delete "${deleteInfo.name}"?`}
            </h5>
            
            {deleteInfo.logs > 0 ? (
              <div className="alert alert-warning mt-3">
                <strong>This symptom has {deleteInfo.logs} log entries.</strong><br/>
                You must delete all log entries before you can delete this symptom.
              </div>
            ) : (
              <p className="text-muted">This action cannot be undone.</p>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteModal} disabled={isDeleting}>
            Cancel
          </Button>
          {deleteInfo.logs > 0 ? (
            <Button 
              variant="primary" 
              onClick={confirmDeleteSymptom}
            >
              View Symptom Details
            </Button>
          ) : (
            <Button 
              variant="danger" 
              onClick={confirmDeleteSymptom} 
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SymptomsList;
