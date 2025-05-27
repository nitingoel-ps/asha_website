import { useState, useEffect, useRef } from 'react';
import { RTVIClient } from '@pipecat-ai/client-js';
import { DailyTransport } from '@pipecat-ai/daily-transport';
import axiosInstance from '../../../utils/axiosInstance';
import { useAuth } from '../../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  
  // State for connection and audio
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [isClientReady, setIsClientReady] = useState(false);
  const [hasBotJoined, setHasBotJoined] = useState(false);
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
  
  // Refs for immediate state access
  const stateRef = useRef({
    isConnected: false,
    isConnecting: false,
    connectionState: 'disconnected',
    isClientReady: false,
    hasBotJoined: false,
    participants: []
  });

  // Update both state and ref
  const updateState = (updates) => {
    // Update the ref immediately
    stateRef.current = { ...stateRef.current, ...updates };
    
    // Update React state
    Object.entries(updates).forEach(([key, value]) => {
      switch(key) {
        case 'isConnected':
          setIsConnected(value);
          break;
        case 'isConnecting':
          setIsConnecting(value);
          break;
        case 'connectionState':
          setConnectionState(value);
          break;
        case 'isClientReady':
          setIsClientReady(value);
          break;
        case 'hasBotJoined':
          setHasBotJoined(value);
          break;
        case 'participants':
          setParticipants(value);
          break;
      }
    });
  };

  // Function to send page context action
  const sendPageContextAction = async () => {
    console.log('[VoiceChat] Attempting to send page context:', {
      hasClient: !!clientRef.current,
      isConnected: stateRef.current.isConnected,
      hasBotJoined: stateRef.current.hasBotJoined,
      pathname: window.location.pathname
    });

    if (clientRef.current && stateRef.current.isConnected && stateRef.current.hasBotJoined) {
      try {
        const someAction = await clientRef.current.action({
          service: "llm",
          action: "append_to_messages",
          arguments: [
            { name: "messages", value: [{role: "system", content: "The user is currently on the page " + window.location.pathname + " of the app. Please keep this in mind when you are helping the user with their question."}] },
          ],
        });
        console.log('[VoiceChat] Successfully sent page context:', {
          pathname: window.location.pathname,
          action: someAction
        });
        addDebugMessage(`Sent page context: ${window.location.pathname}`);
      } catch (error) {
        console.error('[VoiceChat] Error sending page context:', error);
        addDebugMessage(`Error sending page context: ${error.message}`);
      }
    } else {
      console.log('[VoiceChat] Cannot send page context:', {
        hasClient: !!clientRef.current,
        isConnected: stateRef.current.isConnected,
        hasBotJoined: stateRef.current.hasBotJoined,
        reason: !clientRef.current ? 'No client' : !stateRef.current.isConnected ? 'Not connected' : 'Bot not joined'
      });
    }
  };

  // Add debug message to the list
  const addDebugMessage = (message) => {
    console.log('[VoiceChat Debug]', message);
    setDebugMessages(prev => [...prev, `${new Date().toISOString()}: ${message}`].slice(-10));
  };

  // Add a function to log state changes
  const logStateChange = (source, newState) => {
    console.log(`[VoiceChat State Change] ${source}:`, {
      ...stateRef.current,
      newState
    });
  };

  // Handler for navigation messages
  const handleNavigationMessage = (reference) => {
    console.log('[VoiceChat] Processing navigation reference:', reference);
    
    // Extract the path from the reference string, handling all formats:
    // 1. With brackets and Ref: <<Ref: section/med>>
    // 2. With brackets without Ref: <<section/med>>
    // 3. With Ref: prefix but no brackets: Ref: section/med
    // 4. Plain path: section/med
    let path;
    
    // Try to match with brackets first
    const bracketMatch = reference.match(/<<(?:Ref:\s*)?([^>]+)>>/);
    if (bracketMatch) {
      path = bracketMatch[1].trim();
    } else {
      // If no brackets, try to match with Ref: prefix
      const refMatch = reference.match(/^Ref:\s*(.+)$/);
      if (refMatch) {
        path = refMatch[1].trim();
      } else {
        // If no Ref: prefix, use the entire string
        path = reference.trim();
      }
    }

    if (!path) {
      console.log('[VoiceChat] Invalid reference format:', reference);
      return;
    }

    console.log('[VoiceChat] Extracted path:', path);

    // Split the path into segments
    const segments = path.split('/');
    
    // Handle different navigation patterns
    if (segments[0] === 'section') {
      // Format: section/med -> /patient-dashboard/med
      const section = segments[1];
      navigate(`/patient-dashboard/${section}`);
    } else if (segments.length === 2) {
      // Format: med/18 -> /patient-dashboard/med/18
      const [section, id] = segments;
      navigate(`/patient-dashboard/${section}/${id}`);
    } else {
      console.log('[VoiceChat] Unrecognized navigation pattern:', path);
    }
  };

  // Initialize connection
  const initializeConnection = async () => {
    try {
      updateState({
        isConnecting: true,
        error: null,
        connectionState: 'connecting',
        isConnected: false,
        isClientReady: false,
        hasBotJoined: false
      });
      addDebugMessage('Initializing connection...');
      logStateChange('initializeConnection', 'starting');

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
            console.log('[VoiceChat] Participant joined - Full object:', JSON.stringify(p, null, 2));
            const newParticipants = [...stateRef.current.participants, p];
            updateState({ participants: newParticipants });
            
            if (p.name?.includes('Assistant')) {
              console.log('[VoiceChat] Assistant joined, updating state');
              updateState({ hasBotJoined: true });
              logStateChange('onParticipantJoined', 'assistant joined');
              setTimeout(() => sendPageContextAction(), 1000);
            }
          },
          onParticipantLeft: p => {
            const newParticipants = stateRef.current.participants.filter(participant => participant.id !== p.id);
            updateState({ participants: newParticipants });
            
            if (p.name?.includes('Assistant')) {
              console.log('[VoiceChat] Assistant left, updating state');
              updateState({ hasBotJoined: false });
              logStateChange('onParticipantLeft', 'assistant left');
            }
          },
          onParticipantUpdated: p => {
            addDebugMessage(`participantUpdated: ${JSON.stringify(p)}`);
          },
          onUserTranscript: (data) => {
            if (data.final) {
              console.log('[VoiceChat] User transcript:', data.text);
              addDebugMessage(`User: ${data.text}`);
            }
          },
          onBotTranscript: (data) => {
            console.log('[VoiceChat] Bot transcript:', data.text);
            addDebugMessage(`Bot: ${data.text}`);
          },
          onError: (error) => {
            addDebugMessage(`Error: ${error.message}`);
            setError(error.message);
            setIsConnecting(false);
          },
          onConnected: () => {
            console.log('[VoiceChat] onConnected event received.');
            addDebugMessage(`Client has now connected to the chat room.`);
            updateState({
              connectionState: 'connected',
              isConnected: true,
              isClientReady: true,
              isConnecting: false
            });
            logStateChange('onConnected', 'connected');
          },
          onDisconnected: () => {
            console.log('[VoiceChat] onDisconnected event received.');
            addDebugMessage(`Client has now disconnected from the chat room.`);
            updateState({
              connectionState: 'disconnected',
              isConnected: false,
              isClientReady: false,
              hasBotJoined: false
            });
            logStateChange('onDisconnected', 'disconnected');
          },
          onBotConnected: () => {
            console.log('[VoiceChat] onBotConnected event received.');
            addDebugMessage(`Bot has now connected to the chat room.`);
            updateState({ hasBotJoined: true });
            logStateChange('onBotConnected', 'bot connected');
          },
          onBotDisconnected: () => {
            console.log('[VoiceChat] onBotDisconnected event received.');
            addDebugMessage(`Bot has now disconnected from the chat room.`);
            updateState({ hasBotJoined: false });
            logStateChange('onBotDisconnected', 'bot disconnected');
          },
          onTransportStateChanged: (state) => {
            console.log('[VoiceChat] Transport state changed:', {
              newState: state,
              currentState: {
                isConnected: stateRef.current.isConnected,
                isConnecting: stateRef.current.isConnecting,
                connectionState: stateRef.current.connectionState,
                isClientReady: stateRef.current.isClientReady,
                hasBotJoined: stateRef.current.hasBotJoined
              }
            });
            addDebugMessage(`Transport state changed to: ${state}`);
          },
          onServerMessage: (message) => {
            console.log('[VoiceChat] Server message received:', message);
            addDebugMessage(`Server message received: ${message}`);

            // Handle navigation messages
            if (message.type === 'navigate' && message.reference) {
              handleNavigationMessage(message.reference);
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
      console.error('[VoiceChat] Error initializing connection:', error);
      addDebugMessage(`Error initializing connection: ${error.message}`);
      setError(error.message);
      setConnectionState('disconnected');
      setIsConnected(false);
      setIsClientReady(false);
      setIsConnecting(false);
      setHasBotJoined(false);
      logStateChange('initializeConnection', 'error');
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