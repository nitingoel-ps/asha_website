import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Button, Table, Badge, Spinner, Alert, 
  Modal, Form, Row, Col, Container
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
  const [sortedLogs, setSortedLogs] = useState([]);
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

  // Add this state to track screen width
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Add a new state for chart data
  const [chartData, setChartData] = useState(null);

  // Add this effect to update window width state on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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

  // Add a useEffect to prepare chart data whenever logs change
  useEffect(() => {
    if (logs.length >= 2) {
      // Sort logs by date (oldest to newest)
      const sortedLogsArray = [...logs].sort(
        (a, b) => new Date(a.onset_time) - new Date(b.onset_time)
      );
      
      // Store sorted logs in state for tooltip reference
      setSortedLogs(sortedLogsArray);
      
      // Group logs by day and find highest severity for each day
      const dailyHighSeverity = {};
      const allLogsForDay = {};
      
      // Process each log
      sortedLogsArray.forEach(log => {
        // Fix date handling to ensure consistent dates by setting time to noon in local time
        // This prevents timezone issues that might shift dates
        const date = new Date(log.onset_time);
        
        // Format the date in YYYY-MM-DD format for consistent key generation
        // Using date components directly instead of format() to avoid timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        
        // Initialize arrays if this is the first entry for this day
        if (!allLogsForDay[dateKey]) {
          allLogsForDay[dateKey] = [];
        }
        
        // Add log to the day's collection
        allLogsForDay[dateKey].push({
          ...log,
          dateForDisplay: format(date, 'MMM d') // Store formatted date for display
        });
        
        // Update highest severity if this log's severity is higher
        if (!dailyHighSeverity[dateKey] || log.severity > dailyHighSeverity[dateKey]) {
          dailyHighSeverity[dateKey] = log.severity;
        }
      });
      
      // Create array of date keys sorted chronologically
      const sortedDates = Object.keys(dailyHighSeverity).sort();
      
      // Create labels and data arrays from the aggregated data
      const labels = sortedDates.map(dateKey => {
        // Format date from components ensuring consistent display
        const dateParts = dateKey.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
        const day = parseInt(dateParts[2]);
        
        // Create date at noon to avoid timezone issues
        const date = new Date(year, month, day, 12, 0, 0);
        return format(date, 'MMM d');
      });
      
      const data = sortedDates.map(dateKey => dailyHighSeverity[dateKey]);
      
      // Create array of all severity points for scatter plot
      const scatterData = [];
      
      // Process each day's logs for scatter points
      sortedDates.forEach((dateKey, dateIndex) => {
        // Add each log for this day as a separate scatter point
        allLogsForDay[dateKey].forEach(log => {
          scatterData.push({
            x: dateIndex,
            y: log.severity,
            onset_time: log.onset_time,
            id: log.id,
            dateKey: dateKey
          });
        });
      });
      
      setChartData({
        labels,
        datasets: [
          // Line dataset (highest severity per day)
          {
            type: 'line',
            label: 'Highest Severity',
            data: data,
            fill: false,
            backgroundColor: 'rgb(75, 192, 192)',
            borderColor: 'rgba(75, 192, 192, 0.6)',
            tension: 0.2,
            pointRadius: 0, // Hide points for the line dataset
            pointHoverRadius: 0, // Hide hover for line points
            spanGaps: true
          },
          // Scatter dataset (individual log entries)
          {
            type: 'scatter',
            label: 'All Entries',
            data: scatterData,
            backgroundColor: 'rgba(75, 192, 192, 0.8)',
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBorderColor: 'white',
            pointBorderWidth: 2,
          }
        ]
      });
    }
  }, [logs]);

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
            return value;
          }
        },
        title: {
          display: false
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 10
          }
        },
        // Define the x-axis as a category axis
        type: 'category',
        position: 'bottom'
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          title: function(context) {
            const datasetIndex = context[0].datasetIndex;
            const dataIndex = context[0].dataIndex;
            
            // For scatter dataset, get specific log time
            if (datasetIndex === 1) {
              const dataPoint = context[0].raw;
              if (dataPoint && dataPoint.onset_time) {
                // Create date directly from onset_time to ensure consistent display
                const date = new Date(dataPoint.onset_time);
                return format(date, 'MMM d, yyyy h:mm a');
              }
            }
            
            // For line dataset, show the date
            return context[0].label;
          },
          label: function(context) {
            const severityLabels = {
              1: "Very Mild",
              2: "Mild", 
              3: "Moderate", 
              4: "Severe", 
              5: "Very Severe"
            };
            
            let severity;
            
            if (context.datasetIndex === 1) { // Scatter plot point
              severity = context.raw.y;
            } else { // Line chart point
              severity = context.parsed.y;
            }
            
            return `Severity: ${severity} - ${severityLabels[severity] || ''}`;
          },
          afterLabel: function(context) {
            if (context.datasetIndex === 0) { // Line dataset
              return '(Highest severity for this day)';
            }
            return '';
          }
        }
      },
      legend: {
        display: false
      }
    },
    layout: {
      padding: {
        left: 10, 
        right: 30,
        top: 15,
        bottom: 15
      }
    },
    elements: {
      line: {
        tension: 0.3
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };
  
  // Helper function to ensure consistent date formatting throughout the application
  const formatConsistentDate = (dateString) => {
    // Create a date object at noon to avoid timezone issues
    const date = new Date(dateString);
    // Set to noon
    date.setHours(12, 0, 0, 0);
    return format(date, 'MMM d, yyyy');
  };

  // Helper function to format time consistently
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'h:mm a');
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

  // Then where you render logs, check window width
  const isMobile = windowWidth < 768; // Bootstrap MD breakpoint

  return (
    <div className="symptom-detail-container">
      {/* Header Section - Refactored for better responsiveness */}
      <div className="symptom-detail-header mb-4">
        <h2 className="mb-0 symptom-title">
          {symptom.name ? symptom.name : '[No Name Available]'}
        </h2>
        
        <div className="symptom-metadata mt-2">
          {symptom.body_location && (
            <span className="metadata-item d-flex align-items-center text-muted me-3 mb-1">
              <MapPin size={16} className="me-1" /> {symptom.body_location}
            </span>
          )}
          {symptom.common_triggers && (
            <span className="metadata-item text-muted mb-1">
              <strong>Common triggers:</strong> {symptom.common_triggers}
            </span>
          )}
        </div>
        
        {symptom.description && (
          <div className="mt-2">
            <p className="mb-0 symptom-description">{symptom.description}</p>
          </div>
        )}
      </div>

      {/* Chart Card - Enhanced for responsiveness and full-width */}
      <Card className="mb-4 chart-card">
        <Card.Body>
          <h5 className="mb-3">Severity Over Time</h5>
          {logs.length >= 2 ? (
            <div className="chart-container w-100">
              <Line 
                data={chartData || { labels: [], datasets: [] }}  // Use the prepared chart data instead
                options={chartOptions}
                style={{width: '100%'}}
              />
            </div>
          ) : (
            <div className="text-center p-3">
              <p className="text-muted">
                {logs.length === 0 
                  ? "No data available to display chart." 
                  : "Need at least two log entries to display a chart."}
              </p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Logs Header - Now more responsive */}
      <Card className="mb-4 symptom-logs-header">
        <Card.Body className="d-flex flex-wrap justify-content-between align-items-center">
          <div className="d-flex align-items-center mb-2 mb-md-0">
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
          <Button 
            variant="primary" 
            onClick={handleNewLogEntry}
            className="log-button"
          >
            <Plus size={16} className="me-1" />
            <span className="button-text">Log New Episode</span>
          </Button>
        </Card.Body>
      </Card>

      {/* Logs Section - Improved Mobile Rendering */}
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
        <div className="logs-container">
          {!isMobile ? (
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
                          {formatConsistentDate(log.onset_time)}
                        </div>
                        <div className="small text-muted">
                          <Clock size={14} className="me-1" />
                          {formatTime(log.onset_time)}
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
          ) : (
            <div className="mobile-view">
              {logs.sort((a, b) => new Date(b.onset_time) - new Date(a.onset_time)).map(log => (
                <Card key={log.id} className="mb-3 mobile-log-card">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center">
                        <Calendar size={16} className="me-1 text-muted" />
                        <div>
                          <div>{formatConsistentDate(log.onset_time)}</div>
                          <div className="small text-muted">
                            <Clock size={14} className="me-1 d-inline" />
                            {formatTime(log.onset_time)}
                          </div>
                        </div>
                      </div>
                      <div>
                        {getSeverityBadge(log.severity)}
                      </div>
                    </div>
                    
                    <div className="mb-2">
                      <small className="text-muted d-block">Duration:</small>
                      {log.end_time ? (
                        formatDistanceToNow(
                          new Date(log.onset_time),
                          { end: new Date(log.end_time) }
                        )
                      ) : (
                        <span className="text-muted">Ongoing</span>
                      )}
                    </div>
                    
                    {log.triggers && (
                      <div className="mb-2">
                        <small className="text-muted d-block">Triggers:</small>
                        {log.triggers}
                      </div>
                    )}
                    
                    {log.notes && (
                      <div className="mb-3">
                        <small className="text-muted d-block">Notes:</small>
                        {log.notes}
                      </div>
                    )}
                    
                    <div className="d-flex justify-content-end">
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        className="me-2"
                        onClick={() => handleEdit(log)}
                      >
                        <Edit2 size={14} className="me-1" /> Edit
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleDelete(log)}
                      >
                        <Trash2 size={14} className="me-1" /> Delete
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </div>
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
