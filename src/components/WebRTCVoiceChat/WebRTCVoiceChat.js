import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Alert, Form } from 'react-bootstrap';
import { Mic, MicOff, Users, Volume2 } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { RTVIClient } from '@pipecat-ai/client-js';
import { DailyTransport } from '@pipecat-ai/daily-transport';
import './WebRTCVoiceChat.css';
import {
    RTVIClientProvider,
    RTVIClientAudio
  } from '@pipecat-ai/client-react';
import { useAuth } from '../../context/AuthContext';
  
// DEBUG mode - set to true for verbose logging
const DEBUG = true;

// Debug log function
const debugLog = (...args) => {
  if (DEBUG) {
    console.log('[WebRTCVoiceChat]', ...args);
  }
};

const WebRTCVoiceChat = () => {
  const { user } = useAuth();
  // State for connection and UI
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [debugMessages, setDebugMessages] = useState([]);
  const [isClientReady, setIsClientReady] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [botAudioLevel, setBotAudioLevel] = useState(0);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);

  // Refs for maintaining connection state
  const clientRef = useRef(null);
  const transportRef = useRef(null);

  // Add debug message to the list
  const addDebugMessage = (message) => {
    setDebugMessages(prev => [...prev, `${new Date().toISOString()}: ${message}`].slice(-10));
  };

  // Helper function to determine the current status
  const getCurrentStatus = () => {
    if (!isConnected) return 'disconnected';
    if (participants.length === 0) return 'waiting';
    return 'ready';
  };

  // Helper function to format transcript data
  const formatTranscriptMessage = (data) => {
    const timestamp = new Date(data.timestamp).toLocaleTimeString();
    return `[${timestamp}] ${data.text}`;
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
      
      // Create transport
      const transport = new DailyTransport();
      transportRef.current = transport;

      // Create RTVIClient with full configuration
      const client = new RTVIClient({
        transport,
        enableMic: true,  // Start with mic enabled so the track is created
        callbacks: {
          onParticipantJoined: p => {
            addDebugMessage(`${p.name || p.id} joined - Full participant data: ${JSON.stringify(p, null, 2)}`);
            console.log('[WebRTCVoiceChat] participantJoined:', p);
            setParticipants(prev => [...prev, p]);
          },
          onParticipantLeft: p => {
            addDebugMessage(`${p.name || p.id} left - Full participant data: ${JSON.stringify(p, null, 2)}`);
            console.log('[WebRTCVoiceChat] participantLeft:', p);
            setParticipants(prev => prev.filter(participant => participant.id !== p.id));
          },
          onParticipantUpdated: p => {
            addDebugMessage(`participantUpdated: ${JSON.stringify(p)}`);
            console.log('[WebRTCVoiceChat] participantUpdated:', p);
          },
          onUserTranscript: (data) => {
            if (data.final) {
              addDebugMessage(`User: ${formatTranscriptMessage(data)}`);
            }
          },
          onBotTranscript: (data) => {
            addDebugMessage(`Bot: ${formatTranscriptMessage(data)}`);
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
          },
          onLocalAudioLevel: (level) => {
            setUserAudioLevel(level);
          },
          onRemoteAudioLevel: (level, participant) => {
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
            
            // Configure the transport with the credentials
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

        // Log current participants after a short delay (to allow map to populate)
        setTimeout(() => {
          if (clientRef.current && clientRef.current.transport && clientRef.current.transport.participants) {
            const roster = Array.from(clientRef.current.transport.participants.values());
            console.log('Current participants', roster);
            addDebugMessage('Current participants: ' + JSON.stringify(roster));
          }
        }, 1000);
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

  // Audio level visualization component
  const AudioLevelIndicator = ({ level, isSpeaking, label }) => (
    <div className="audio-level-indicator">
      <div className="audio-level-label">
        <Volume2 size={16} className={isSpeaking ? 'speaking' : ''} />
        <span>{label}</span>
      </div>
      <div className="audio-level-bar">
        <div 
          className="audio-level-fill"
          style={{ 
            width: `${level * 100}%`,
            opacity: isSpeaking ? 1 : 0.5
          }}
        />
      </div>
    </div>
  );

  return (
    <Card className="p-4">
      <Card.Body>
        <h2>WebRTC Voice Chat</h2>
        
        {/* Connection Status */}
        <div className="mb-3">
          <span className={`status-indicator ${getCurrentStatus()}`}></span>
          <span className="ms-2">Status: {
            getCurrentStatus() === 'disconnected' ? 'Disconnected' :
            getCurrentStatus() === 'waiting' ? 'Waiting for agent...' :
            'Ready to talk'
          }</span>
        </div>

        {/* Audio Level Indicators */}
        <div className="audio-levels mb-3">
          <AudioLevelIndicator 
            level={userAudioLevel}
            isSpeaking={isUserSpeaking}
            label="You"
          />
          <AudioLevelIndicator 
            level={botAudioLevel}
            isSpeaking={isBotSpeaking}
            label="Bot"
          />
        </div>

        {/* Participants Display */}
        <div className="mb-3 participants-display">
          <Users size={20} className="me-2" />
          <span>
            {participants.length === 0 
              ? "No other participants in room"
              : `Participants: ${participants.map(p => p.name || p.id).join(', ')}`}
          </span>
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

        {/* Debug Toggle and Messages */}
        <div className="mt-4">
          <Form.Check 
            type="switch"
            id="debug-toggle"
            label="Show Debug Messages"
            checked={showDebug}
            onChange={(e) => setShowDebug(e.target.checked)}
          />
          
          {showDebug && (
            <div className="debug-messages mt-3">
              <h4>Debug Messages</h4>
              <div className="debug-messages-container">
                {debugMessages.map((message, index) => (
                  <div key={index} className="debug-message">
                    {message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default WebRTCVoiceChat;