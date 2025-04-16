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
        setIsLoading(true);
        const response = await axiosInstance.get('/provider-connections/');
        const connectionsData = response.data?.connections || [];
        setConnections(connectionsData);
        
        // Determine the overall connection status
        if (connectionsData.length === 0) {
          setConnectionStatus(CONNECTION_STATUS.NO_CONNECTIONS);
        } else if (connectionsData.some(conn => conn.status === 'SUCCESS')) {
          setConnectionStatus(CONNECTION_STATUS.SUCCESS);
        } else {
          setConnectionStatus(CONNECTION_STATUS.PROCESSING);
        }
      } catch (err) {
        console.error("Error fetching connection status:", err);
        setError("Failed to fetch connection status");
        // Default to NO_CONNECTIONS on error
        setConnectionStatus(CONNECTION_STATUS.NO_CONNECTIONS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnectionStatus();

    // Poll for connection status every minute
    const intervalId = setInterval(fetchConnectionStatus, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Function to get appropriate messages based on connection status and section
  const getEmptyStateMessage = (section) => {
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
        
        return sectionNoConnections[section] || {
          message: "Connect to your healthcare providers to see your health information here.",
          action: "Connect Provider"
        };
      
      case CONNECTION_STATUS.PROCESSING:
        return {
          heading: "Processing Your Health Data",
          message: `We're currently analyzing your health records. Your ${section} will appear here soon.`,
          action: "Check back in a few minutes"
        };
      
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
        
        return sectionMessages[section] || {
          heading: "No Data Available",
          message: "No information found for this section in your health records.",
          action: null
        };
      
      default:
        return {
          heading: "Loading...",
          message: "Please wait while we load your health information.",
          action: null
        };
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