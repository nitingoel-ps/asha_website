import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Alert } from 'react-bootstrap';
import { Mic, MicOff } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { RTVIClient } from '@pipecat-ai/client-js';
import { DailyTransport } from '@pipecat-ai/daily-transport';
import './WebRTCVoiceChat.css';
import {
    RTVIClientProvider,
    RTVIClientAudio
  } from '@pipecat-ai/client-react';
  
// DEBUG mode - set to true for verbose logging
const DEBUG = true;

// Debug log function
const debugLog = (...args) => {
  if (DEBUG) {
    console.log('[WebRTCVoiceChat]', ...args);
  }
};

const WebRTCVoiceChat = () => {
  // State for connection and UI
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [debugMessages, setDebugMessages] = useState([]);
  const [isClientReady, setIsClientReady] = useState(false);

  // Refs for maintaining connection state
  const clientRef = useRef(null);
  const transportRef = useRef(null);

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
      const fullUrl = `${baseUrl}${connectEndpoint}`;
      
      addDebugMessage(`Full connection URL will be: ${fullUrl}`);
      addDebugMessage(`Auth token exists: ${!!localStorage.getItem('access_token')}`);

      // Create transport
      const transport = new DailyTransport();
      addDebugMessage('Created DailyTransport instance');
      transportRef.current = transport;

      addDebugMessage('Creating RTVIClient...');

      // Create RTVIClient with full configuration
      const client = new RTVIClient({
        transport,
        enableMic: true,  // Start with mic enabled so the track is created
        callbacks: {
          onPartialTranscript: (transcript) => {
            addDebugMessage(`Partial transcript: ${transcript}`);
          },
          onFinalTranscript: (transcript) => {
            addDebugMessage(`Final transcript: ${transcript}`);
          },
          onError: (error) => {
            addDebugMessage(`Error: ${error.message}`);
            setError(error.message);
          },
          onConnectionState: (state) => {
            addDebugMessage(`Connection state changed to: ${state}`);
            setConnectionState(state);
            // Handle all possible connection states
            if (state === 'connected' || state === 'ready') {
              setConnectionState('connected');
              setIsConnected(true);
              setIsClientReady(true);
              addDebugMessage('Client is now ready for audio');
            } else if (state === 'disconnected' || state === 'error') {
              setConnectionState('disconnected');
              setIsConnected(false);
              setIsClientReady(false);
              addDebugMessage('Client disconnected or encountered an error');
            } else if (state === 'connecting') {
              setIsConnected(false);
              setIsClientReady(false);
            } else {
              addDebugMessage(`Unhandled connection state: ${state}`);
            }
          },
          onTransportStateChanged: (state) => {
            addDebugMessage(`Transport state changed to: ${state}`);
            // Update connection state based on transport state
            if (state === 'connected' || state === 'ready') {
              setConnectionState('connected');
              setIsConnected(true);
              setIsClientReady(true);
              addDebugMessage('Transport is ready for audio');
            } else if (state === 'disconnected' || state === 'error') {
              setConnectionState('disconnected');
              setIsConnected(false);
              setIsClientReady(false);
              addDebugMessage('Transport disconnected or encountered an error');
            } else if (state === 'connecting') {
              setIsConnected(false);
              setIsClientReady(false);
            } else {
              addDebugMessage(`Unhandled transport state: ${state}`);
            }
          }
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
          addDebugMessage('Custom connect handler called');
          addDebugMessage(`Params: ${JSON.stringify(params)}`);
          
          try {
            const response = await axiosInstance.post(params.endpoints.connect);
            const { url: roomUrl, token } = response.data;
            addDebugMessage(`Connect response: ${JSON.stringify(response.data)}`);
            
            // Configure the transport with the credentials
            addDebugMessage('Configuring transport with Daily.co credentials...');
            await transportRef.current.preAuth({
              url: roomUrl,
              token: token
            });
            addDebugMessage('Transport configured successfully');
            
            if (timeout) {
              clearTimeout(timeout);
            }
            
            return response.data;
          } catch (error) {
            addDebugMessage(`Connect request failed: ${error.message}`);
            if (error.response) {
              addDebugMessage(`Response data: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
          }
        }
      });
      clientRef.current = client;

      addDebugMessage('RTVIClient created, attempting to connect...');

      // Connect the client
      try {
        await client.connect();
        addDebugMessage('Client connected successfully');
        setConnectionState('connected');
        setIsConnected(true);
        setIsClientReady(true);
        addDebugMessage('Microphone enabled (UI state synced after connect)');
      } catch (connectError) {
        addDebugMessage(`Client connect error: ${connectError.message}`);
        if (connectError.stack) {
          addDebugMessage(`Connect error stack: ${connectError.stack}`);
        }
        setConnectionState('disconnected');
        setIsConnected(false);
        setIsClientReady(false);
        throw connectError;
      }
    } catch (error) {
      addDebugMessage(`Error initializing connection: ${error.message}`);
      addDebugMessage(`Error stack: ${error.stack}`);
      setError(error.message);
      setConnectionState('disconnected');
      setIsConnected(false);
      setIsClientReady(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && 
          clientRef.current && 
          connectionState === 'disconnected') {
        addDebugMessage('Tab regained focus, attempting to reconnect...');
        await initializeConnection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connectionState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    const msg = `RENDER: isConnected=${isConnected}, isClientReady=${isClientReady}`;
    addDebugMessage(msg);
    console.log('[WebRTCVoiceChat]', msg);
  }, [isConnected, isClientReady]);

  return (
    <Card className="p-4">
      <Card.Body>
        <h2>WebRTC Voice Chat</h2>
        
        {/* Connection Status */}
        <div className="mb-3">
          <span className={`status-indicator ${connectionState}`}></span>
          <span className="ms-2">Status: {connectionState}</span>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {/* Controls */}
        <div className="voice-chat-controls">
          {!isConnected && !isConnecting && (
            <Button
              variant="primary"
              onClick={initializeConnection}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          )}
        </div>

        {/* Audio Provider */}
        {isClientReady && clientRef.current && (
          <RTVIClientProvider client={clientRef.current}>
            <RTVIClientAudio />
          </RTVIClientProvider>
        )}

        {/* Debug Messages */}
        <div className="debug-messages mt-4">
          <h4>Debug Messages</h4>
          <div className="debug-messages-container">
            {debugMessages.map((message, index) => (
              <div key={index} className="debug-message">
                {message}
              </div>
            ))}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default WebRTCVoiceChat;