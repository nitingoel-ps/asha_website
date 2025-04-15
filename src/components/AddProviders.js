import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Card, Button, Form, Table, Alert, Collapse, Tabs, Tab, Row, Col } from "react-bootstrap";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import './AddProviders.css';
import { FaCheck, FaSpinner, FaTimes, FaSync, FaTrash, FaCircle, FaPlus, FaExclamationTriangle } from 'react-icons/fa';
import { isMobileDevice } from '../utils/deviceDetector';

// Create a custom event bus for Provider Connections page
export const providerConnectionsEvents = {
  ADD_NEW_CONNECTION: 'provider-connections-add-new'
};

function AddProviders() {
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [providers, setProviders] = useState([]); // To store the list of providers
  const [selectedProvider, setSelectedProvider] = useState(""); // To store the selected provider
  const [connections, setConnections] = useState([]); // To store existing connections
  const [loadingConnections, setLoadingConnections] = useState(true); // Track loading of connections
  const [errorConnections, setErrorConnections] = useState(""); // Track errors fetching connections
  // Add new state variables for search
  const [searchType, setSearchType] = useState("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [refreshProgress, setRefreshProgress] = useState({});
  const [pollingTimers, setPollingTimers] = useState({});
  const [expandedProviders, setExpandedProviders] = useState(new Set());
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  // Add state for active tab
  const [activeTab, setActiveTab] = useState('connected');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  const EXPECTED_TASKS = [
    { id: 'fetch_data', display: 'Downloading Medical Records' },
    { id: 'update_cdm', display: 'Updating your Records' },
    { id: 'generate_ai_summaries', display: 'AI Review' }
  ];

  const EXPECTED_RESOURCES = [
    'Patient',
    'Encounter',
    'DiagnosticReport',
    'Procedure',
    'MedicationRequest',
    'AllergyIntolerance',
    'Immunization',
    'CareTeam',
    'Condition',
    'DocumentReference'
  ];

  useEffect(() => {
    // Fetch available providers
    axiosInstance
      .get("/providers")
      .then((response) => {
        setProviders(response.data.providers || []); // Set providers from the API response
        if (response.data.providers.length > 0) {
          setSelectedProvider(response.data.providers[0].id); // Set default selection
        }
      })
      .catch((error) => {
        console.error("Failed to fetch providers:", error);
      });
  }, []);

  useEffect(() => {
    return () => {
      Object.values(pollingTimers).forEach(timer => clearInterval(timer));
    };
  }, [pollingTimers]);

  const fetchLatestProgress = async (providerId) => {
    try {
      const response = await axiosInstance.get('/data-refresh-progress/', {
        params: {
          provider_id: providerId
        }
      });
      
      if (response.data.progress) {
        setRefreshProgress(prev => ({
          ...prev,
          [providerId]: response.data.progress
        }));

        // Start polling if status is PENDING
        if (response.data.progress.overall_status === 'PENDING') {
          startPollingRefreshProgress(providerId);
        }
      }
    } catch (error) {
      console.error('Error fetching progress for provider:', providerId, error);
    }
  };

  // Modify the connections loading effect to fetch progress after connections are loaded
  useEffect(() => {
    const loadConnectionsAndProgress = async () => {
      try {
        const response = await axiosInstance.get("/provider-connections/");
        const connectionsList = response.data || [];
        setConnections(connectionsList);
        setLoadingConnections(false);

        // Load saved progress from localStorage first
        const savedProgress = localStorage.getItem('refreshProgress');
        if (savedProgress) {
          setRefreshProgress(JSON.parse(savedProgress));
        }

        // Fetch latest progress for each connection
        connectionsList.forEach(connection => {
          fetchLatestProgress(connection.id);
        });
      } catch (error) {
        console.error("Failed to fetch connections:", error);
        setErrorConnections("Failed to load connections.");
        setLoadingConnections(false);
      }
    };

    loadConnectionsAndProgress();
  }, []);

  // Start polling for pending connections when connections or refreshProgress changes
  useEffect(() => {
    connections.forEach(connection => {
      const progress = refreshProgress[connection.id];
      if (progress?.overall_status === 'PENDING') {
        startPollingRefreshProgress(connection.id);
      }
    });
  }, [connections]); // Dependencies array only includes connections

  const startPollingRefreshProgress = async (providerId) => {
    console.log("Setting up polling for provider:", providerId);
    if (pollingTimers[providerId]) {
      clearInterval(pollingTimers[providerId]);
    }

    const pollProgress = async () => {
      try {
        console.log("Polling progress for provider:", providerId);
        const response = await axiosInstance.get('/data-refresh-progress/', {
          params: {
            provider_id: providerId
          }
        });
        console.log("Poll response:", response.data);
        
        const newProgress = response.data.progress;
        
        // Update localStorage and state
        setRefreshProgress(prev => {
          const updated = {
            ...prev,
            [providerId]: newProgress
          };
          localStorage.setItem('refreshProgress', JSON.stringify(updated));
          return updated;
        });

        // Stop polling if status is SUCCESS or ERROR
        if (newProgress.overall_status === 'SUCCESS' || newProgress.overall_status === 'ERROR') {
          clearInterval(pollingTimers[providerId]);
          setPollingTimers(prev => {
            const newTimers = { ...prev };
            delete newTimers[providerId];
            return newTimers;
          });
        }
      } catch (error) {
        console.error('Error polling refresh progress:', error);
      }
    };

    // Start polling immediately
    await pollProgress();
    const timerId = setInterval(pollProgress, 2000);
    setPollingTimers(prev => ({
      ...prev,
      [providerId]: timerId
    }));
  };

  const refreshConnectionStatus = async () => {
    try {
      const response = await axiosInstance.get("/provider-connections/");
      setConnections(response.data || []);
    } catch (error) {
      console.error("Failed to refresh connections:", error);
    }
  };

  const handleWindowClosure = async (providerId) => {
    //alert("OAuth window closed - starting data refresh polling");
    
    // Start both progress polling and connection status polling
    startPollingRefreshProgress(providerId);
    
    // Immediately refresh connections
    await refreshConnectionStatus();

    // Poll connection status every 5 seconds
    const statusTimer = setInterval(refreshConnectionStatus, 5000);
    
    // Stop polling connection status after 30 seconds or when refresh completes
    setTimeout(() => {
      clearInterval(statusTimer);
    }, 30000);
  };

  const handleConnectProvider = async (providerId) => {
    try {
      if (!providerId) {
        alert("Please select a provider.");
        return;
      }

      const response = await axiosInstance.get(`/oauth/authorize-url?provider=${providerId}`);
      const oauthUrl = response.data.url;
      
      if (isMobileDevice()) {
        // For mobile devices, redirect in the same window
        window.location.href = oauthUrl;
        return;
      }

      // For desktop devices, continue with popup behavior
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popupWindow = window.open(
        oauthUrl,
        "OAuthPopup",
        `width=${width},height=${height},top=${top},left=${left},resizable,scrollbars=yes,noopener,noreferrer`
      );

      const pollTimer = setInterval(() => {
        try {
          if (!popupWindow || popupWindow.closed) {
            clearInterval(pollTimer);
            console.log("OAuth window closed");
            handleWindowClosure(providerId);
            return;
          }

          if (popupWindow.location.href.includes(window.location.origin)) {
            console.log("Detected redirect to our domain:", popupWindow.location.href);
            const params = new URL(popupWindow.location.href).searchParams;
            const code = params.get("code");
            const state = params.get("state");
            
            if (code && state) {
              console.log("OAuth flow completed successfully");
              popupWindow.close();
              // Window closure will be detected by the above check
            }
          }
        } catch (err) {
          // Cross-origin errors are expected until redirect
        }
      }, 500);

    } catch (error) {
      console.error("Failed to initiate OAuth flow:", error);
    }
  };

  // Utility function to format ISO dates
  const formatDateTime = (isoString) => {
    if (!isoString) return "N/A"; // Handle missing or invalid dates
    try {
      const date = parseISO(isoString); // Parse the ISO date
      if (isoString.includes("T")) {
        return format(date, "PPpp"); // Format to human-readable date/time
      } else {
        return format(date, "PP"); // Format to human-readable date only
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  // Function to get status message and icon for a connection
  const getConnectionStatusInfo = (connection) => {
    const status = connection.last_fetch_status;
    const lastFetchedAt = connection.last_fetched_at;
    
    // Find the in-progress task for this connection if it exists
    const progress = refreshProgress[connection.id];
    
    if (status === "PENDING" || (progress && progress.overall_status === 'PENDING')) {
      // Determine which task is in progress
      let currentTaskDisplay = "Processing...";
      
      if (progress && progress.tasks) {
        for (const expectedTask of EXPECTED_TASKS) {
          const task = progress.tasks.find(t => t.task === expectedTask.id);
          if (task && (task.status === 'PENDING' || task.status === 'IN_PROGRESS')) {
            currentTaskDisplay = `${expectedTask.display}...`;
            break;
          }
        }
      }
      
      return {
        icon: <FaSpinner className="connection-status-icon spinning" />,
        text: currentTaskDisplay,
        className: "provider-status-pending"
      };
    } else if (status === "ERROR") {
      return {
        icon: <FaExclamationTriangle className="connection-status-icon" />,
        text: "Processing Failed, please try again",
        className: "provider-status-error"
      };
    } else {
      // SUCCESS or any other status
      if (!lastFetchedAt) {
        return {
          icon: <FaCircle className="connection-status-icon" />,
          text: "Unknown last fetch time",
          className: "provider-status-unknown"
        };
      }
      
      const lastFetchedTime = parseISO(lastFetchedAt);
      return {
        icon: <FaCircle className="connection-status-icon" />,
        text: `Last fetched ${formatDistanceToNow(lastFetchedTime)} ago`,
        className: "provider-status-success"
      };
    }
  };

  const getStatusDisplay = (status, lastFetchedAt) => {
    if (status !== "SUCCESS") {
      return status; // Show the status if it's not SUCCESS
    }
    if (!lastFetchedAt) {
      return "Unknown last fetch time";
    }
    const lastFetchedTime = parseISO(lastFetchedAt);
    return `Last fetched data ${formatDistanceToNow(lastFetchedTime)} ago`; // Calculate "time ago"
  };

  // Add search handler function
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchError("Please enter a search term");
      return;
    }

    setIsSearching(true);
    setSearchError("");
    setSearchResults([]);

    try {
      const response = await axiosInstance.get('/search-health-organizations/', {
        params: {
          type: searchType,
          query: searchQuery
        }
      });
      setSearchResults(response.data.results || []); // Update to use results array
    } catch (error) {
      console.error("Search failed:", error);
      setSearchError("Failed to search for healthcare providers. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const formatFetchDataDetails = (detailsString) => {
    try {
      const details = JSON.parse(detailsString);
      return (
        <Table className="fetch-data-table" size="sm" borderless>
          <thead>
            <tr>
              <th>Resource Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {EXPECTED_RESOURCES.map(resource => {
              const status = details[resource] || 'Pending';
              const isCompleted = details[resource] !== undefined;
              return (
                <tr key={resource} className={isCompleted ? '' : 'resource-pending'}>
                  <td>{resource}</td>
                  <td>
                    {isCompleted ? (
                      <>
                        <FaCheck className="task-icon" />
                        {status}
                      </>
                    ) : (
                      <span className="text-muted">Waiting...</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      );
    } catch (e) {
      return detailsString;
    }
  };

  const getTaskDisplayName = (taskName) => {
    if (taskName === 'fetch_data') return 'Downloading Medical Records';
    return taskName;
  };

  const getTaskDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return null;
    
    const start = parseISO(startTime);
    const end = parseISO(endTime);
    const durationSeconds = (end - start) / 1000;
    
    if (durationSeconds < 60) {
      return `${Math.round(durationSeconds)}s`;
    }
    return `${Math.round(durationSeconds / 60)}m ${Math.round(durationSeconds % 60)}s`;
  };

  const toggleTaskDetails = (taskId) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const RefreshProgress = ({ providerId }) => {
    const progress = refreshProgress[providerId];
    if (!progress) return null;

    const tasks = progress.tasks || [];
    const tasksMap = tasks.reduce((acc, task) => {
      acc[task.task] = task;
      return acc;
    }, {});

    return (
      <div className="refresh-progress">
        <div className="progress-header">
          <div className="progress-timestamps">
            <div>Started: {formatDateTime(progress.started_at)}</div>
            {progress.completed_at && (
              <div>Completed: {formatDateTime(progress.completed_at)}</div>
            )}
          </div>
          <div className="progress-status">
            {progress.overall_status}
          </div>
        </div>
        <div className="task-list">
          {EXPECTED_TASKS.map((expectedTask) => {
            const task = tasksMap[expectedTask.id];
            const isPending = !task;
            const isInProgress = task?.status === 'PENDING' || task?.status === 'IN_PROGRESS';

            
            return (
              <div key={expectedTask.id} className="task-item">
                <div 
                  className={`task-main-row ${expectedTask.id === 'fetch_data' ? 'task-row-clickable' : ''}`}
                  onClick={expectedTask.id === 'fetch_data' ? () => toggleTaskDetails(expectedTask.id) : undefined}
                >
                  <div className="task-status-icon">
                    {task?.status === 'COMPLETED' && <FaCheck className="task-icon task-completed" />}
                    {isInProgress && <FaSpinner className="task-icon task-spinner" />}
                    {task?.status === 'ERROR' && <FaTimes className="task-icon task-error" />}
                    {(!task || task.status === 'NOT_STARTED') && <FaSpinner className="task-icon task-not-started" />}
                  </div>
                  <div className="task-name-container">
                    <span className={isInProgress ? 'task-in-progress' : ''}>
                      {expectedTask.display}
                    </span>
                    {expectedTask.id === 'fetch_data' && (
                      <span className="toggle-indicator task-toggle">
                        {expandedTasks.has(expectedTask.id) ? '▼' : '▶'}
                      </span>
                    )}
                  </div>
                  <div className="task-duration">
                    {isInProgress ? (
                      <span className="task-progress-pulse">In Progress...</span>
                    ) : (
                      task?.status === 'COMPLETED' && task.task_start && task.task_end && 
                      `(took ${getTaskDuration(task.task_start, task.task_end)})`
                    )}
                  </div>
                </div>
                {expectedTask.id === 'fetch_data' && (
                  <Collapse in={expandedTasks.has(expectedTask.id)}>
                    <div className="task-details-row">
                      {formatFetchDataDetails(task?.task_details || '{}')}
                    </div>
                  </Collapse>
                )}
              </div>
            );
          })}
        </div>
        {progress.error_message && (
          <div className="text-danger mt-2">{progress.error_message}</div>
        )}
      </div>
    );
  };

  const toggleProviderProgress = (providerId) => {
    setExpandedProviders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(providerId)) {
        newSet.delete(providerId);
      } else {
        newSet.add(providerId);
      }
      return newSet;
    });
  };
  
  // Handler for switching to Add New tab
  const handleSwitchToAddNew = () => {
    setActiveTab('addNew');
  };

  // Function to listen for the custom add new connection event
  useEffect(() => {
    const handleAddNewConnection = () => {
      handleSwitchToAddNew();
    };

    // Listen for the add new connection event
    window.addEventListener(providerConnectionsEvents.ADD_NEW_CONNECTION, handleAddNewConnection);

    return () => {
      window.removeEventListener(providerConnectionsEvents.ADD_NEW_CONNECTION, handleAddNewConnection);
    };
  }, []);

  // Set the mobile page title
  useEffect(() => {
    if (window.setMobilePageTitle) {
      window.setMobilePageTitle("Provider Connections");
    }

    // Add mobile action button (+ button in header)
    if (window.setMobileActionButton) {
      window.setMobileActionButton({
        icon: "plus",
        action: () => {
          // Dispatch custom event
          const event = new CustomEvent(providerConnectionsEvents.ADD_NEW_CONNECTION);
          window.dispatchEvent(event);
        }
      });
    }

    // Handle window resize
    const handleResize = () => {
      setIsMobile(window.innerWidth < 992);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Clear mobile page title and action button when component unmounts
      if (window.setMobilePageTitle) {
        window.setMobilePageTitle(null);
      }
      if (window.setMobileActionButton) {
        window.setMobileActionButton(null);
      }
    };
  }, []);

  // Render connection cards
  const renderConnectionCards = () => {
    if (loadingConnections) {
      return <p>Loading connections...</p>;
    }
    
    if (errorConnections) {
      return <p className="text-danger">{errorConnections}</p>;
    }
    
    if (connections.length === 0) {
      return (
        <div className="no-connections-message">
          <p>You don't have any connections yet.</p>
          <Button 
            variant="primary" 
            className="add-connection-btn"
            onClick={handleSwitchToAddNew}
          >
            <FaPlus className="me-2" />
            Add Your First Connection
          </Button>
        </div>
      );
    }
    
    return (
      <Row className="connection-cards-container">
        {connections.map(connection => {
          const statusInfo = getConnectionStatusInfo(connection);
          const isPending = connection.last_fetch_status === "PENDING";
          
          return (
            <Col xs={12} md={6} lg={4} key={connection.id} className="mb-3">
              <Card className="connection-card">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div 
                    className="connection-title"
                    onClick={() => toggleProviderProgress(connection.id)}
                  >
                    {connection.provider}
                  </div>
                  <div className="connection-actions">
                    {isPending ? (
                      <span className="action-icon refresh-pending">
                        <FaSpinner className="spinning" />
                      </span>
                    ) : (
                      <button 
                        className="action-icon-btn"
                        onClick={() => handleConnectProvider(connection.id)}
                        disabled={isPending}
                      >
                        <FaSync />
                      </button>
                    )}
                    <button className="action-icon-btn">
                      <FaTrash />
                    </button>
                  </div>
                </Card.Header>
                <Card.Body
                  onClick={() => toggleProviderProgress(connection.id)} 
                  className="connection-card-body"
                >
                  <div className={`provider-connection-status ${statusInfo.className}`}>
                    {statusInfo.icon}
                    <span>{statusInfo.text}</span>
                  </div>
                </Card.Body>
                <Collapse in={expandedProviders.has(connection.id)}>
                  <div className="connection-details">
                    <RefreshProgress providerId={connection.id} />
                  </div>
                </Collapse>
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  // Render the add new connection UI
  const renderAddNewConnection = () => {
    return (
      <>
        {/* Connect to a New Provider */}
        <Card className="card">
          <Card.Body>
            <Card.Title>Connect to a Provider</Card.Title>
            <Card.Text>
              Please select a provider to connect your health data.
            </Card.Text>
            <Form.Group controlId="providerSelect">
              <Form.Label>Select Provider</Form.Label>
              <Form.Control
                as="select"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                autoComplete="off"
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>
            <Button variant="primary" onClick={() => handleConnectProvider(selectedProvider)} className="mt-3">
              Connect Provider
            </Button>
          </Card.Body>
        </Card>

        {/* Add new search card */}
        <Card className="search-card">
          <Card.Body>
            <Card.Title>Search Healthcare Providers</Card.Title>
            <Form onSubmit={handleSearch}>
              <Form.Group className="search-controls">
                <Form.Label>Search Type</Form.Label>
                <Form.Check
                  className="search-type-radio mb-2"
                  type="radio"
                  label="Search by Name"
                  name="searchType"
                  checked={searchType === "name"}
                  onChange={() => setSearchType("name")}
                />
                <Form.Check
                  type="radio"
                  label="Search by Address"
                  name="searchType"
                  checked={searchType === "address"}
                  onChange={() => setSearchType("address")}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>
                  {searchType === "name" ? "Provider Name" : "Address"}
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder={searchType === "name" ? "Enter provider name" : "Enter address"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Form.Group>

              <Button type="submit" variant="primary" disabled={isSearching}>
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </Form>

            {searchError && (
              <Alert variant="danger" className="mt-3">
                {searchError}
              </Alert>
            )}

            {searchResults.length > 0 && (
              <div className="search-results">
                <h5>Search Results</h5>
                <div className="table-container">
                  <Table striped bordered hover>
                    <thead><tr>
                      <th>Organization Name</th>
                      <th>Parent Organization</th>
                      <th className="address-cell">Location</th>
                      <th>EHR System</th>
                      <th>Action</th>
                    </tr></thead>
                    <tbody>
                      {searchResults.map((org) => (<tr key={org.org_id}>
                        <td>{org.name}</td>
                        <td>{org.parent_name || 'N/A'}</td>
                        <td className="address-cell">
                          <div className="address-main">{org.std_address}</div>
                          <div className="address-secondary">
                            {org.city}, {org.state} {org.zip}
                          </div>
                        </td>
                        <td>{org.EHR_system || 'N/A'}</td>
                        <td>
                          <Button
                            variant="primary"
                            size="sm"
                            className="action-button"
                            onClick={() => handleConnectProvider(org.org_id)}
                          >Connect</Button>
                        </td>
                      </tr>))}
                    </tbody>
                  </Table>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      </>
    );
  };

  return (
    <Container className="providers-container">
      <div className="provider-header">
        {!isMobile && <h2>Provider Connections</h2>}
        {!isMobile && connections.length > 0 && (
          <Button 
            variant="primary" 
            className="add-another-connection-btn"
            onClick={handleSwitchToAddNew}
          >
            <FaPlus className="me-2" />
            Add Another Connection
          </Button>
        )}
      </div>

      <Tabs 
        activeKey={activeTab} 
        onSelect={(key) => setActiveTab(key)} 
        className="provider-tabs"
      >
        <Tab eventKey="connected" title="Connected">
          <div className="connected-tab-content">
            {renderConnectionCards()}
            {isMobile && connections.length > 0 && (
              <div className="text-center mt-3 mobile-only">
                <Button 
                  variant="primary" 
                  className="add-another-connection-btn"
                  onClick={handleSwitchToAddNew}
                >
                  <FaPlus className="me-2" />
                  Add Another Connection
                </Button>
              </div>
            )}
          </div>
        </Tab>
        <Tab eventKey="addNew" title="Add New">
          <div className="add-new-tab-content">
            {renderAddNewConnection()}
          </div>
        </Tab>
      </Tabs>
    </Container>
  );
}

export default AddProviders;
