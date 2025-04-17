import React, { createContext, useState, useContext, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";

// Connection status constants
export const CONNECTION_STATUS = {
  NO_CONNECTIONS: "NO_CONNECTIONS",
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS"
};

const ConnectionContext = createContext();

export const useConnection = () => useContext(ConnectionContext);

export const ConnectionProvider = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    const fetchConnectionStatus = async () => {
      try {
        console.log("🔌 ConnectionContext: Fetching connection status...");
        setIsLoading(true);
        const response = await axiosInstance.get('/provider-connections/');
        
        // Response may be directly an array or nested in a connections property
        let connectionsData = [];
        if (Array.isArray(response.data)) {
          connectionsData = response.data;
          console.log("🔌 ConnectionContext: API returned array directly");
        } else if (response.data?.connections && Array.isArray(response.data.connections)) {
          connectionsData = response.data.connections;
          console.log("🔌 ConnectionContext: API returned connections property");
        }
        
        setConnections(connectionsData);
        
        console.log("🔌 ConnectionContext: Received connections data:", connectionsData);
        
        // Determine the overall connection status
        let newStatus;
        if (connectionsData.length === 0) {
          newStatus = CONNECTION_STATUS.NO_CONNECTIONS;
        } else if (connectionsData.some(conn => conn.last_fetch_status === 'SUCCESS')) {
          newStatus = CONNECTION_STATUS.SUCCESS;
        } else {
          newStatus = CONNECTION_STATUS.PROCESSING;
        }
        
        console.log(`🔌 ConnectionContext: Setting connection status to ${newStatus} (old: ${connectionStatus})`);
        setConnectionStatus(newStatus);
      } catch (err) {
        console.error("❌ ConnectionContext: Error fetching connection status:", err);
        setError("Failed to fetch connection status");
        // Default to NO_CONNECTIONS on error
        console.log("🔌 ConnectionContext: Setting status to NO_CONNECTIONS due to error");
        setConnectionStatus(CONNECTION_STATUS.NO_CONNECTIONS);
      } finally {
        setIsLoading(false);
        console.log("🔌 ConnectionContext: Finished loading connection status");
      }
    };

    fetchConnectionStatus();

    // Poll for connection status every minute
    const intervalId = setInterval(fetchConnectionStatus, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Log any connection status changes
  useEffect(() => {
    if (connectionStatus) {
      console.log(`🔌 ConnectionContext: Connection status is now ${connectionStatus}`);
      console.log(`🔌 ConnectionContext: isLoading = ${isLoading}, error = ${error}`);
    }
  }, [connectionStatus, isLoading, error]);

  // Function to get appropriate messages based on connection status and section
  const getEmptyStateMessage = (section) => {
    console.log(`🔌 ConnectionContext: Getting empty state message for ${section} with status ${connectionStatus}`);
    
    switch (connectionStatus) {
      case CONNECTION_STATUS.NO_CONNECTIONS:
        const sectionNoConnections = {
          "medications": {
            message: "Connect to your healthcare providers to see possible medication interactions and safety alerts for your prescriptions.",
            action: "Connect Provider"
          },
          "screenings": {
            message: "Connect to your healthcare providers to see recommended health screenings based on your age, gender, and medical history.",
            action: "Connect Provider"
          },
          "labs": {
            message: "Connect to your healthcare providers to see key lab results that you should track closely with easy-to-understand interpretations.",
            action: "Connect Provider"
          },
          "vitals": {
            message: "Connect to your healthcare providers to see your vital signs.",
            action: "Connect Provider"
          },
          "insights": {
            message: "Connect to your healthcare providers to receive personalized health insights and suggested action items based on your medical history.",
            action: "Connect Provider"
          },
          "immunizations": {
            message: "Connect to your healthcare providers to see your immunization history, including vaccines received and those that may be due.",
            action: "Connect Provider"
          },
          "visits": {
            message: "Connect to your healthcare providers to see your visit history, including details of past appointments and doctor notes.",
            action: "Connect Provider"
          },
          "medical-reports": {
            message: "Connect to your healthcare providers to access your medical reports and test results from previous appointments.",
            action: "Connect Provider"
          },
          "lab-panels": {
            message: "Connect to your healthcare providers to see your lab test results organized by panel type with trends and interpretations.",
            action: "Connect Provider"
          }
        };
        
        const noConnectionsMessage = sectionNoConnections[section] || {
          message: "Connect to your healthcare providers to see your health information here.",
          action: "Connect Provider"
        };
        
        console.log(`🔌 ConnectionContext: Returning NO_CONNECTIONS message for ${section}:`, noConnectionsMessage);
        return noConnectionsMessage;
      
      case CONNECTION_STATUS.PROCESSING:
        const processingMessage = {
          heading: "Processing Your Health Data",
          message: `We're currently analyzing your health records. Your ${section} will appear here soon.`,
          action: "Check back in a few minutes"
        };
        
        console.log(`🔌 ConnectionContext: Returning PROCESSING message for ${section}:`, processingMessage);
        return processingMessage;
      
      case CONNECTION_STATUS.SUCCESS:
        const sectionMessages = {
          "medications": {
            heading: "No Medication Interactions",
            message: "No medication interactions found in your health records.",
            action: null
          },
          "screenings": {
            heading: "No Screenings Due",
            message: "You're up to date with your recommended health screenings.",
            action: null
          },
          "labs": {
            heading: "No Lab Results",
            message: "No important lab results found in your health records.",
            action: null
          },
          "vitals": {
            heading: "No Vital Signs",
            message: "No vital signs found in your health records.",
            action: null
          },
          "insights": {
            heading: "No Health Priorities",
            message: "We'll analyze your health data and provide personalized priorities as more information becomes available.",
            action: null
          },
          "immunizations": {
            heading: "No Immunizations Found",
            message: "No immunization records were found in your health data.",
            action: null
          },
          "visits": {
            heading: "No Visits Found",
            message: "No visit or appointment records were found in your health data.",
            action: null
          },
          "medical-reports": {
            heading: "No Medical Reports Found",
            message: "No medical reports or diagnostic results were found in your health data.",
            action: null
          },
          "lab-panels": {
            heading: "No Lab Panels Found",
            message: "No laboratory test results were found in your health data.",
            action: null
          }
        };
        
        const successMessage = sectionMessages[section] || {
          heading: "No Data Available",
          message: "No information found for this section in your health records.",
          action: null
        };
        
        console.log(`🔌 ConnectionContext: Returning SUCCESS message for ${section}:`, successMessage);
        return successMessage;
      
      default:
        const defaultMessage = {
          heading: "Loading...",
          message: "Please wait while we load your health information.",
          action: null
        };
        
        console.log(`🔌 ConnectionContext: Returning DEFAULT message for ${section}:`, defaultMessage);
        return defaultMessage;
    }
  };

  return (
    <ConnectionContext.Provider
      value={{
        connectionStatus,
        isLoading,
        error,
        connections,
        getEmptyStateMessage
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export default ConnectionContext; 