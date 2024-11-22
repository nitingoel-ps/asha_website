// src/components/Dashboard.js
import React, { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Button, Navbar, Nav, Form } from 'react-bootstrap';
import AppNavbar from "./Navbar";

function Dashboard() {
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]); // To store the list of providers
  const [selectedProvider, setSelectedProvider] = useState(""); // To store the selected provider

  useEffect(() => {
    axiosInstance
      .get('/welcome/')
      .then((response) => {
        setMessage(response.data.message);
      })
      .catch((error) => {
        console.error(error);
        navigate('/login');
      });
  }, [navigate]);

  useEffect(() => {
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

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete axiosInstance.defaults.headers.common['Authorization'];
    navigate('/login');
  };

  const handleConnectProvider = async () => {
    try {
      if (!selectedProvider) {
        alert("Please select a provider.");
        return;
      }
      const response = await axiosInstance.get(`/oauth/authorize-url?provider=${selectedProvider}`);
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

  return (
    <>
      <Container className="mt-5">
        <h2 className="mb-4">Dashboard</h2>
        <Card className="mb-3">
          <Card.Body>
            <Card.Title>Welcome Message</Card.Title>
            <Card.Text>{message ? message : 'Loading...'}</Card.Text>
          </Card.Body>
        </Card>
        {/* Additional Cards or Content */}
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
            <Button variant="primary" onClick={handleConnectProvider}>
              Connect Provider
            </Button>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
}

export default Dashboard;