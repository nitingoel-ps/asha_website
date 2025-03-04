import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Button, Table, Badge, Spinner, Alert, 
  Modal, Form, Row, Col 
} from 'react-bootstrap';
import { 
  Plus, ArrowLeft, Calendar, Clock, AlertTriangle, 
  Edit2, Trash2, Info, MapPin, FileText
} from 'lucide-react';
import axiosInstance from '../../../utils/axiosInstance';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import './Symptoms.css';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const SymptomDetail = () => {
  const { symptomId } = useParams();
  const navigate = useNavigate();
  const [symptom, setSymptom] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [formValues, setFormValues] = useState({
    severity: '',
    onset_time: '',
    end_time: '',
    triggers: '',
    notes: ''
  });

  useEffect(() => {
    console.log("SymptomDetail - Initial symptomId:", symptomId);
    fetchSymptomDetails();
    fetchSymptomLogs();
  }, [symptomId]);

  const fetchSymptomDetails = async () => {
    try {
      console.log("SymptomDetail - Fetching details for symptomId:", symptomId);
      // Fix: The URL has a typo, should be /symptoms/ (plural) not /symptom/ (singular)
      const response = await axiosInstance.get(`/symptoms/${symptomId}/`);
      console.log('Symptom Detail API Response:', response.data);
      
      // Fix: The API returns { "symptom": { ... } } not "symptoms"
      const symptomData = response.data.symptom || response.data;
      
      console.log('SymptomDetail - Parsed symptom data:', symptomData);
      
      if (symptomData) {
        setSymptom(symptomData);
        console.log('SymptomDetail - Set symptom state to:', symptomData);
      } else {
        setError('Symptom not found');
        console.error('Symptom not found in response');
      }
    } catch (err) {
      console.error('Error fetching symptom details:', err);
      setError('Failed to load symptom details');
    }
  };

  const fetchSymptomLogs = async () => {
    try {
      // Updated to use symptom_id instead of symptom
      const response = await axiosInstance.get(`/symptom-logs/?symptom_id=${symptomId}`);
      console.log('Symptom Logs API Response:', response.data);
      
      // Updated to handle the new API response format where logs are inside symptom_logs key
      const logsData = response.data.symptom_logs || 
                       (Array.isArray(response.data) ? response.data : []);
      
      console.log('Extracted logs data:', logsData);
      
      setLogs(logsData);
    } catch (err) {
      console.error('Error fetching symptom logs:', err);
      setError('Failed to load symptom logs');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (log) => {
    setSelectedLog(log);
    setFormValues({
      severity: log.severity,
      onset_time: format(new Date(log.onset_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: log.end_time ? format(new Date(log.end_time), "yyyy-MM-dd'T'HH:mm") : '',
      triggers: log.triggers || '',
      notes: log.notes || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = (log) => {
    setSelectedLog(log);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      // Updated to use the RESTful endpoint
      await axiosInstance.delete(`/symptom-logs/${selectedLog.id}/`);
      fetchSymptomLogs();
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Error deleting log:', err);
      alert('Failed to delete log entry');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value
    });
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    try {
      // Updated to use symptom_id instead of symptom
      await axiosInstance.put(`/symptom-logs/${selectedLog.id}/`, {
        symptom_id: parseInt(symptomId),
        severity: parseInt(formValues.severity),
        onset_time: formValues.onset_time,
        end_time: formValues.end_time || null,
        triggers: formValues.triggers,
        notes: formValues.notes
      });
      fetchSymptomLogs();
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating log:', err);
      alert('Failed to update log entry');
    }
  };

  const handleNewLogEntry = () => {
    navigate(`/patient-dashboard/symptoms/${symptomId}/log`);
  };

  // Add a useEffect to log whenever symptom state changes
  useEffect(() => {
    console.log('SymptomDetail - Symptom state updated:', symptom);
  }, [symptom]);

  const prepareChartData = (logsData) => {
    // Sort logs by date (oldest to newest)
    const sortedLogs = [...logsData].sort(
      (a, b) => new Date(a.onset_time) - new Date(b.onset_time)
    );
    
    // Extract dates and severity values
    const labels = sortedLogs.map(log => format(new Date(log.onset_time), 'MMM d'));
    const data = sortedLogs.map(log => log.severity);
    
    return {
      labels,
      datasets: [
        {
          label: 'Severity',
          data,
          fill: false,
          backgroundColor: 'rgb(75, 192, 192)',
          borderColor: 'rgba(75, 192, 192, 0.6)',
          tension: 0.2,
          pointRadius: 5,
          pointHoverRadius: 7,
        }
      ]
    };
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
        ticks: {
          stepSize: 1,
          callback: function(value) {
            const severityLabels = {
              1: "Very Mild",
              2: "Mild", 
              3: "Moderate", 
              4: "Severe", 
              5: "Very Severe"
            };
            return value + (value in severityLabels ? ` (${severityLabels[value]})` : '');
          }
        },
        title: {
          display: true,
          text: 'Severity Level'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const severityLabels = {
              1: "Very Mild",
              2: "Mild", 
              3: "Moderate", 
              4: "Severe", 
              5: "Very Severe"
            };
            const severity = context.raw;
            return `Severity: ${severity} - ${severityLabels[severity] || ''}`;
          }
        }
      }
    }
  };

  if (loading) {
    console.log('SymptomDetail - Rendering loading state');
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading symptom details...</p>
      </div>
    );
  }

  if (error) {
    console.log('SymptomDetail - Rendering error state:', error);
    return (
      <Alert variant="danger" className="my-4">
        {error}
      </Alert>
    );
  }

  if (!symptom) {
    console.log('SymptomDetail - Symptom is null or undefined');
    return (
      <Alert variant="warning" className="my-4">
        Symptom not found
      </Alert>
    );
  }

  // Log all the properties of the symptom object for debugging
  console.log('SymptomDetail - Symptom object properties:', Object.keys(symptom));
  console.log('SymptomDetail - Symptom name:', symptom.name);
  console.log('SymptomDetail - Symptom body_location:', symptom.body_location);
  console.log('SymptomDetail - Symptom priority_order:', symptom.priority_order);

  const getSeverityBadge = (severity) => {
    let variant;
    switch (severity) {
      case 1: variant = "info"; break;
      case 2: variant = "success"; break;
      case 3: variant = "warning"; break;
      case 4: case 5: variant = "danger"; break;
      default: variant = "secondary";
    }
    
    const severityLabels = {
      1: "Very Mild",
      2: "Mild",
      3: "Moderate",
      4: "Severe",
      5: "Very Severe"
    };
    
    return <Badge bg={variant}>{severityLabels[severity] || "Unknown"}</Badge>;
  };

  return (
    <div>
      <div className="d-flex flex-column mb-4 symptom-detail-header">
        <div className="d-flex align-items-center mb-2">
          <Button 
            variant="outline-secondary" 
            className="me-3 back-button"
            onClick={() => navigate('/patient-dashboard/symptoms')}
          >
            <ArrowLeft size={16} />
          </Button>
          <h2 className="mb-0">
            {symptom.name ? symptom.name : '[No Name Available]'}
          </h2>
        </div>
        
        <div className="d-flex flex-wrap align-items-center mt-2">
          {symptom.body_location && (
            <span className="me-3 d-flex align-items-center text-muted">
              <MapPin size={16} className="me-1" /> {symptom.body_location}
            </span>
          )}
          {symptom.common_triggers && (
            <span className="me-3 text-muted">
              <strong>Common triggers:</strong> {symptom.common_triggers}
            </span>
          )}
        </div>
        
        {symptom.description && (
          <div className="mt-2">
            <p className="mb-0">{symptom.description}</p>
          </div>
        )}
      </div>

      {/* Chart Card */}
      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">Severity Over Time</h5>
          {logs.length >= 2 ? (
            <div style={{ height: '300px' }}>
              <Line 
                data={prepareChartData(logs)} 
                options={chartOptions}
              />
            </div>
          ) : (
            <div className="text-center p-4">
              <p className="text-muted">
                {logs.length === 0 
                  ? "No data available to display chart." 
                  : "Need at least two log entries to display a chart."}
              </p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Add a prominent section header for the logs */}
      <Card className="mb-4 symptom-logs-header">
        <Card.Body className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FileText size={24} className="text-primary me-2" />
            <div>
              <h3 className="mb-0">{symptom.name} History</h3>
              <p className="text-muted mb-0">
                {logs.length > 0 
                  ? `${logs.length} episode${logs.length !== 1 ? 's' : ''} recorded` 
                  : 'No episodes recorded yet'}
              </p>
            </div>
          </div>
          <Button variant="primary" onClick={handleNewLogEntry}>
            <Plus size={16} className="me-1" />
            Log New Episode
          </Button>
        </Card.Body>
      </Card>

      {logs.length === 0 ? (
        <Card className="text-center p-4 empty-state-container">
          <Card.Body>
            <Info size={48} className="empty-state-icon mb-3" />
            <h5>No episodes logged yet</h5>
            <p className="text-muted">
              Start tracking this symptom by logging your first episode.
            </p>
            <Button variant="primary" onClick={handleNewLogEntry}>
              <Plus size={16} className="me-1" />
              Log First Episode
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Table responsive hover className="symptom-logs-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Severity</th>
                <th>Duration</th>
                <th>Triggers</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.sort((a, b) => new Date(b.onset_time) - new Date(a.onset_time)).map(log => (
                <tr key={log.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <Calendar size={16} className="me-1 text-muted" />
                      {format(new Date(log.onset_time), 'MMM d, yyyy')}
                    </div>
                    <div className="small text-muted">
                      <Clock size={14} className="me-1" />
                      {format(new Date(log.onset_time), 'h:mm a')}
                    </div>
                  </td>
                  <td>{getSeverityBadge(log.severity)}</td>
                  <td>
                    {log.end_time ? (
                      formatDistanceToNow(
                        new Date(log.onset_time),
                        { end: new Date(log.end_time) }
                      )
                    ) : (
                      <span className="text-muted">Ongoing</span>
                    )}
                  </td>
                  <td>
                    {log.triggers ? (
                      log.triggers.length > 30 
                        ? `${log.triggers.substring(0, 30)}...` 
                        : log.triggers
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                  <td>
                    {log.notes ? (
                      log.notes.length > 30 
                        ? `${log.notes.substring(0, 30)}...` 
                        : log.notes
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                  <td>
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      className="me-2"
                      onClick={() => handleEdit(log)}
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => handleDelete(log)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-4">
            <AlertTriangle size={48} className="text-danger mb-3" />
            <h5>Are you sure you want to delete this log entry?</h5>
            <p className="text-muted">This action cannot be undone.</p>
          </div>
          {selectedLog && (
            <div className="bg-light p-3 rounded mb-3">
              <p className="mb-1"><strong>Date:</strong> {format(new Date(selectedLog.onset_time), 'MMM d, yyyy h:mm a')}</p>
              <p className="mb-0"><strong>Severity:</strong> {selectedLog.severity}/5</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Symptom Log</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmitEdit}>
            <Form.Group className="mb-3">
              <Form.Label>Severity</Form.Label>
              <Form.Select 
                name="severity" 
                value={formValues.severity}
                onChange={handleInputChange}
                required
              >
                <option value="">Select severity</option>
                <option value="1">1 - Very Mild</option>
                <option value="2">2 - Mild</option>
                <option value="3">3 - Moderate</option>
                <option value="4">4 - Severe</option>
                <option value="5">5 - Very Severe</option>
              </Form.Select>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Time</Form.Label>
                  <Form.Control 
                    type="datetime-local"
                    name="onset_time"
                    value={formValues.onset_time}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Time (optional)</Form.Label>
                  <Form.Control 
                    type="datetime-local"
                    name="end_time"
                    value={formValues.end_time}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Triggers</Form.Label>
              <Form.Control 
                as="textarea"
                rows={2}
                name="triggers"
                value={formValues.triggers}
                onChange={handleInputChange}
                placeholder="What may have triggered this episode?"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control 
                as="textarea"
                rows={3}
                name="notes"
                value={formValues.notes}
                onChange={handleInputChange}
                placeholder="Additional notes about this symptom episode"
              />
            </Form.Group>
            
            <div className="d-flex justify-content-end">
              <Button variant="secondary" className="me-2" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save Changes
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default SymptomDetail;
