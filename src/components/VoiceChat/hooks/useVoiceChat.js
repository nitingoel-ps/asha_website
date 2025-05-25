import { useState, useEffect, useRef } from 'react';
import { RTVIClient } from '@pipecat-ai/client-js';
import { DailyTransport } from '@pipecat-ai/daily-transport';
import axiosInstance from '../../../utils/axiosInstance';
import { useAuth } from '../../../context/AuthContext';
import { useLocation } from 'react-router-dom';

// Debug mode - set to true for verbose logging
const DEBUG = true;

// Debug log function
const debugLog = (...args) => {
  if (DEBUG) {
    console.log('[VoiceChat]', ...args);
  }
};

export const useVoiceChat = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  // State for connection and audio
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [isClientReady, setIsClientReady] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [botAudioLevel, setBotAudioLevel] = useState(0);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [debugMessages, setDebugMessages] = useState([]);

  // Refs for maintaining connection state
  const clientRef = useRef(null);
  const transportRef = useRef(null);

  // Function to send page context action
  const sendPageContextAction = async () => {
    console.log(' >>>> In sendPageContextAction, window.location.pathname:', window.location.pathname);
    if (clientRef.current && isConnected) {
      console.log(' >>>> In sendPageContextAction, clientRef.current:', clientRef.current);
      console.log(' >>>> In sendPageContextAction, isConnected:', isConnected);
      try {
        const someAction = await clientRef.current.action({
          service: "llm",
          action: "append_to_messages",
          arguments: [
            { name: "messages", value: [{role: "system", content: "The user is currently on the page " + window.location.pathname + " of the app. Please keep this in mind when you are helping the user with their question."}] },
          ],
        });
        console.log(' >> In sendPageContextAction, sent page context:', window.location.pathname);
        console.log(' >> In sendPageContextAction, someAction:', someAction);
        addDebugMessage(`Sent page context: ${window.location.pathname}`);
      } catch (error) {
        console.error('Error sending page context:', error);
        addDebugMessage(`Error sending page context: ${error.message}`);
      }
    } else {
      console.log('Cannot send page context - client not ready or not connected');
    }
  };

  // Add debug message to the list
  const addDebugMessage = (message) => {
    setDebugMessages(prev => [...prev, `${new Date().toISOString()}: ${message}`].slice(-10));
  };

  // Initialize connection
  const initializeConnection = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      addDebugMessage('Initializing connection...');

      const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
      const connectEndpoint = '/voice/connect/';
      
      // Create transport
      const transport = new DailyTransport();
      transportRef.current = transport;

      // Create RTVIClient with full configuration
      const client = new RTVIClient({
        transport,
        enableMic: true,
        callbacks: {
          onParticipantJoined: p => {
            addDebugMessage(`${p.name || p.id} joined`);
            setParticipants(prev => [...prev, p]);
            // Send page context when participant joins (connection is fully established)
            setTimeout(() => sendPageContextAction(), 1000); // Add small delay to ensure everything is ready
          },
          onParticipantLeft: p => {
            addDebugMessage(`${p.name || p.id} left`);
            setParticipants(prev => prev.filter(participant => participant.id !== p.id));
          },
          onParticipantUpdated: p => {
            addDebugMessage(`participantUpdated: ${JSON.stringify(p)}`);
          },
          onUserTranscript: (data) => {
            if (data.final) {
              addDebugMessage(`User: ${data.text}`);
            }
          },
          onBotTranscript: (data) => {
            addDebugMessage(`Bot: ${data.text}`);
          },
          onError: (error) => {
            addDebugMessage(`Error: ${error.message}`);
            setError(error.message);
            setIsConnecting(false);
          },
          onConnectionState: (state) => {
            addDebugMessage(`Connection state changed to: ${state}`);
            setConnectionState(state);
            if (state === 'connected' || state === 'ready') {
              setConnectionState('connected');
              setIsConnected(true);
              setIsClientReady(true);
              setIsConnecting(false);
              // Remove the immediate page context send from here
              // It will be sent when the participant joins
            } else if (state === 'disconnected' || state === 'error') {
              setConnectionState('disconnected');
              setIsConnected(false);
              setIsClientReady(false);
              setIsConnecting(false);
            } else if (state === 'connecting') {
              setIsConnected(false);
              setIsClientReady(false);
              setIsConnecting(true);
            }
          },
          onTransportStateChanged: (state) => {
            addDebugMessage(`Transport state changed to: ${state}`);
            if (state === 'connected' || state === 'ready') {
              setConnectionState('connected');
              setIsConnected(true);
              setIsClientReady(true);
              setIsConnecting(false);
            } else if (state === 'disconnected' || state === 'error') {
              setConnectionState('disconnected');
              setIsConnected(false);
              setIsClientReady(false);
              setIsConnecting(false);
            } else if (state === 'connecting') {
              setIsConnected(false);
              setIsClientReady(false);
              setIsConnecting(true);
            }
          },
          onLocalAudioLevel: (level) => {
            setUserAudioLevel(level);
          },
          onRemoteAudioLevel: (level) => {
            setBotAudioLevel(level);
          },
          onBotStartedSpeaking: () => {
            setIsBotSpeaking(true);
            addDebugMessage('Bot started speaking');
          },
          onBotStoppedSpeaking: () => {
            setIsBotSpeaking(false);
            setBotAudioLevel(0);
            addDebugMessage('Bot stopped speaking');
          },
          onUserStartedSpeaking: () => {
            setIsUserSpeaking(true);
            addDebugMessage('User started speaking');
          },
          onUserStoppedSpeaking: () => {
            setIsUserSpeaking(false);
            setUserAudioLevel(0);
            addDebugMessage('User stopped speaking');
          },
          onBotLlmStarted: () => {
            setIsBotThinking(true);
            addDebugMessage('Bot started thinking');
          },
          onBotLlmStopped: () => {
            setIsBotThinking(false);
            addDebugMessage('Bot finished thinking');
          },
        },
        params: {
          baseUrl: baseUrl,
          endpoints: {
            connect: connectEndpoint,
            action: '/voice/action/'
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        },
        customConnectHandler: async (params, timeout, abortController) => {
          try {
            const response = await axiosInstance.post(params.endpoints.connect);
            const { url: roomUrl, token } = response.data;
            
            await transportRef.current.preAuth({
              url: roomUrl,
              token: token,
              userName: user?.first_name || 'Guest'
            });
            
            if (timeout) {
              clearTimeout(timeout);
            }
            
            return response.data;
          } catch (error) {
            addDebugMessage(`Connect request failed: ${error.message}`);
            throw error;
          }
        }
      });
      clientRef.current = client;

      addDebugMessage('RTVIClient created, attempting to connect...');

      // Connect the client
      await client.connect();
      addDebugMessage('Client connected successfully');
      setConnectionState('connected');
      setIsConnected(true);
      setIsClientReady(true);
      setIsConnecting(false);

    } catch (error) {
      addDebugMessage(`Error initializing connection: ${error.message}`);
      setError(error.message);
      setConnectionState('disconnected');
      setIsConnected(false);
      setIsClientReady(false);
      setIsConnecting(false);
    }
  };

  // Effect to send page context when URL changes
  useEffect(() => {
    if (isConnected && clientRef.current) {
      // Add a small delay to ensure client is ready
      setTimeout(() => sendPageContextAction(), 500);
    }
  }, [location.pathname, isConnected]);

  // Handle connection toggle
  const handleConnectionToggle = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await connect();
    }
  };

  // Connect function
  const connect = async () => {
    if (!isConnected && !isConnecting) {
      await initializeConnection();
    }
  };

  // Disconnect function
  const disconnect = async () => {
    if (isConnected && clientRef.current) {
      try {
        setIsConnecting(true);
        await clientRef.current.disconnect();
        setConnectionState('disconnected');
        setIsConnected(false);
        setIsClientReady(false);
        addDebugMessage('Client disconnected');
      } catch (error) {
        addDebugMessage(`Error disconnecting: ${error.message}`);
        setError(error.message);
      } finally {
        setIsConnecting(false);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  return {
    // State
    isConnected,
    isConnecting,
    error,
    connectionState,
    isClientReady,
    participants,
    userAudioLevel,
    botAudioLevel,
    isUserSpeaking,
    isBotSpeaking,
    isBotThinking,
    debugMessages,
    clientRef,
    
    // Actions
    connect,
    disconnect,
    handleConnectionToggle,
    addDebugMessage,
  };
}; 