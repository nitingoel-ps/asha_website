import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useNavigate } from "react-router-dom";
import { Container, Card, Button, Navbar, Nav, Form, Table } from "react-bootstrap";
import { format, parseISO, formatDistanceToNow } from "date-fns"; // Import date-fns functions

function AddProviders() {
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]); // To store the list of providers
  const [selectedProvider, setSelectedProvider] = useState(""); // To store the selected provider
  const [connections, setConnections] = useState([]); // To store existing connections
  const [loadingConnections, setLoadingConnections] = useState(true); // Track loading of connections
  const [errorConnections, setErrorConnections] = useState(""); // Track errors fetching connections

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
        `width=${width},height=${height},top=${top},left=${left},resizable,scrollbars=yes`
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

  return (
    <>
      <Container className="mt-5">
        <h2 className="mb-4">Connect to Providers</h2>

      {/* Display Current Connections */}
        <Card className="mb-3">
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
        <Card>
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
      </Container>
    </>
  );
}

export default AddProviders;
