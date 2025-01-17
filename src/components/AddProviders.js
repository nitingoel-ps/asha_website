import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useNavigate } from "react-router-dom";
import { Container, Card, Button, Form, Table, Alert } from "react-bootstrap";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import './AddProviders.css';

function AddProviders() {
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
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

  useEffect(() => {
    axiosInstance
      .get("/welcome/")
      .then((response) => {
        setMessage(response.data.message);
      })
      .catch((error) => {
        console.error(error);
        navigate("/login");
      });
  }, [navigate]);

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

    // Fetch existing connections
    axiosInstance
      .get("/provider-connections")
      .then((response) => {
        setConnections(response.data || []); // Set connections from the API response
        setLoadingConnections(false);
      })
      .catch((error) => {
        console.error("Failed to fetch connections:", error);
        setErrorConnections("Failed to load connections.");
        setLoadingConnections(false);
      });
  }, []);

  const handleConnectProvider = async (providerId) => {
    try {
      if (!providerId) {
        alert("Please select a provider.");
        return;
      }
      const response = await axiosInstance.get(`/oauth/authorize-url?provider=${providerId}`);
      const oauthUrl = response.data.url;
        // Open the OAuth URL in a popup window
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
          // Check if the popup has redirected to your app's domain
          if (popupWindow.closed) {
            clearInterval(pollTimer);
            console.log("OAuth popup closed");
          } else if (popupWindow.location.href.includes(window.location.origin)) {
            // Only check if it's your origin; avoid accessing other properties
            console.log ("The popup window is now ours! ",popupWindow.location.href)
            const params = new URL(popupWindow.location.href).searchParams;
            const code = params.get("code");
            const state = params.get("state");
            popupWindow.close();
            clearInterval(pollTimer);
  
            // Handle the retrieved code and state
            console.log("OAuth success! Code:", code, "State:", state);
          }
        } catch (err) {
          // Cross-origin errors are expected until the popup redirects to your domain
        }
      }, 500); // Poll every 500ms
    } catch (error) {
      console.error("Failed to get OAuth URL:", error);
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
      const response = await axiosInstance.get('/search-health-organizations', {
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

  return (
    <Container className="providers-container">
      <h2 className="mb-4">Connect to Providers</h2>

      {/* Display Current Connections */}
      <Card className="card">
        <Card.Body>
          <Card.Title>Current Connections</Card.Title>
          {loadingConnections ? (
            <p>Loading connections...</p>
          ) : errorConnections ? (
            <p className="text-danger">{errorConnections}</p>
          ) : connections.length === 0 ? (
            <p>No connections found.</p>
          ) : (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Connected on</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((connection) => (
                  <tr key={connection.id}>
                    <td>{connection.provider}</td>
                    <td>{formatDateTime(connection.created_at)}</td>
                      <td>{getStatusDisplay(connection.last_fetch_status, connection.last_fetched_at)}</td>
                      <td>
                        {/* Conditional Button for Refresh */}
                        <Button
                          variant="primary"
                          disabled={connection.last_fetch_status === "PENDING"}
                          onClick={() => handleConnectProvider(connection.id)}
                        >
                          Refresh
                        </Button>
                      </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          </Card.Body>
        </Card>

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
            <Button variant="primary" onClick={() => handleConnectProvider(selectedProvider)}>
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
                    <thead>
                      <tr>
                        <th>Organization Name</th>
                        <th>Parent Organization</th>
                        <th className="address-cell">Location</th>
                        <th>EHR System</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map((org) => (
                        <tr key={org.org_id}>
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
                            >
                              Connect
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
    </Container>
  );
}

export default AddProviders;
