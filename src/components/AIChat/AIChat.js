import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import axiosInstance from '../../utils/axiosInstance';
import './AIChat.css';
import { processStreamingContent } from './MessageUtils';

function AIChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId } = useParams(); // Get session ID from URL
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  
  // Add a ref to track if we've already processed the URL session ID
  const processedSessionIdRef = useRef(null);
  
  // Store the initial message in component state instead of relying on location.state
  // This ensures we don't lose it when location.state changes
  const [storedInitialMessage, setStoredInitialMessage] = useState(location.state?.initialMessage);
  
  console.log('AIChat component loaded with initialMessage:', storedInitialMessage);
  console.log('Location state:', location.state);
  console.log('URL session ID:', sessionId);

  // Fetch sessions on initial mount
  useEffect(() => {
    console.log('Initial mount effect running');
    fetchSessions();
  }, []);

  // Handle URL-based session selection - only when sessions load or URL changes
  useEffect(() => {
    if (sessionId && sessions.length > 0 && !loading) {
      // Skip if we've already processed this session ID
      if (processedSessionIdRef.current === sessionId) {
        console.log('Already processed session ID:', sessionId);
        return;
      }
      
      console.log('Selecting session from URL parameter:', sessionId);
      const sessionFromUrl = sessions.find(s => 
        s.id === sessionId || s.id === parseInt(sessionId)
      );
      
      if (sessionFromUrl) {
        console.log('Found session matching URL parameter:', sessionFromUrl);
        // Only update if it's different from the current selection
        if (!selectedSession || selectedSession.id !== sessionFromUrl.id) {
          console.log('Setting selected session from URL');
          setSelectedSession(sessionFromUrl);
          // Mark this session ID as processed
          processedSessionIdRef.current = sessionId;
        }
      } else {
        console.log('No session found matching URL parameter');
        // If session not found, redirect to base chat URL
        navigate('/ai-chat', { replace: true });
      }
    }
  }, [sessionId, sessions, loading]); // Only depend on sessionId, sessions, and loading

  // Handle the initial message after sessions are loaded and not loading
  useEffect(() => {
    console.log('Effect for handling initial message triggered:', {
      storedInitialMessage,
      initialMessageSent,
      loading
    });
    
    if (storedInitialMessage && !initialMessageSent && !loading) {
      console.log('About to handle new chat with message:', storedInitialMessage);
      handleNewChatWithMessage(storedInitialMessage);
      setInitialMessageSent(true);
      
      // Only clear navigation state after we've started processing the message
      console.log('Clearing initialMessage from navigation state');
      navigate(location.pathname, { 
        replace: true,
        state: { ...location.state, initialMessage: undefined } 
      });
      
      console.log('Set initialMessageSent to true');
    }
  }, [storedInitialMessage, initialMessageSent, loading]);

  const fetchSessions = async () => {
    console.log('Fetching sessions');
    try {
      const response = await axiosInstance.get('/chat-sessions/');
      console.log('Fetched sessions:', response.data);
      // Ensure we're accessing the correct property from the response
      // and that we initialize with an empty array if data is null/undefined
      setSessions(response.data?.sessions || []);
      setLoading(false);
      console.log('Sessions loaded, loading set to false');
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      setSessions([]); // Initialize with empty array on error
      setLoading(false);
      console.log('Error loading sessions, loading set to false');
    }
  };

  const handleNewChat = async () => {
    // Check if the current session exists and has no messages
    if (selectedSession && selectedSession.messages && selectedSession.messages.length === 0) {
      console.log('Current session is empty, reusing it instead of creating a new one');
      return; // Just reuse the current empty session
    }
    
    try {
      setLoading(true);
      const response = await axiosInstance.post('/chat-sessions/', {
        session_name: 'New Chat' // Default name for new chat sessions
      });
      const newSession = response.data;
      setSessions([newSession, ...sessions]);
      setSelectedSession(newSession);
      
      // Update URL to include the new session ID
      processedSessionIdRef.current = newSession.id.toString();
      navigate(`/ai-chat/${newSession.id}`);
    } catch (error) {
      console.error('Error creating new chat session:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // New function to create chat with initial message
  const handleNewChatWithMessage = async (message) => {
    console.log('handleNewChatWithMessage called with message:', message);
    try {
      setLoading(true);
      console.log('Setting loading to true before creating session');
      
      // First create a new session with a better name derived from the message
      const sessionName = message.split('\n')[0].substring(0, 30) + (message.length > 30 ? '...' : '');
      console.log('Using session name:', sessionName);
      
      const response = await axiosInstance.post('/chat-sessions/', {
        session_name: sessionName
      });
      console.log('Created new session:', response.data);
      const newSession = response.data;
      
      // Update sessions and select the new one with initialMessage flag
      setSessions(prev => {
        console.log('Adding new session to sessions array');
        return [newSession, ...prev];
      });
      
      console.log('Setting selectedSession with initialMessage flag');
      // Create a deep copy of the session with the initialMessage
      // This ensures the flag won't be lost during React render cycles
      const sessionWithMessage = {
        ...newSession,
        initialMessage: message, // Pass the message to the chat window for auto-sending
        preserveUserMessage: true // Add flag to ensure user message is preserved
      };
      setSelectedSession(sessionWithMessage);
      
      // Update URL to include the new session ID
      processedSessionIdRef.current = newSession.id.toString();
      navigate(`/ai-chat/${newSession.id}`);
    } catch (error) {
      console.error('Error creating new chat session with message:', error);
    } finally {
      setLoading(false);
      console.log('Setting loading to false after creating session');
    }
  };

  const handleSelectSession = async (session) => {
    // Skip if already selected
    if (selectedSession && selectedSession.id === session.id) {
      console.log('Session already selected, skipping:', session.id);
      return;
    }
    
    setLoading(true);
    try {
      // Fetch fresh session data to ensure we have latest messages
      const response = await axiosInstance.get(`/chat-sessions/${session.id}`);
      setSelectedSession(response.data.session); // Access the session object from response
      
      // Update URL to reflect the selected session
      processedSessionIdRef.current = session.id.toString();
      navigate(`/ai-chat/${session.id}`);
    } catch (error) {
      console.error('Error fetching session details:', error);
      // Fall back to using the session data we already have
      setSelectedSession(session);
      
      // Still update URL even if there was an error fetching details
      processedSessionIdRef.current = session.id.toString();
      navigate(`/ai-chat/${session.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await axiosInstance.delete(`/chat-sessions/${sessionId}/delete/`);
      setSessions(sessions.filter(session => session.id !== sessionId));
      
      // If we're deleting the currently selected session, clear selection and update URL
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        processedSessionIdRef.current = null;
        navigate('/ai-chat');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleRenameSession = async (sessionId, newName) => {
    try {
      await axiosInstance.put(`/chat-sessions/${sessionId}/`, {
        session_name: newName
      });
      setSessions(sessions.map(session =>
        session.id === sessionId
          ? { ...session, session_name: newName }
          : session
      ));
    } catch (error) {
      console.error('Error renaming session:', error);
    }
  };

  // Add a debounce utility for the session refresh
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  // Create a function to refresh just one session by ID
  const refreshSessionById = async (sessionId) => {
    try {
      console.log(`Refreshing session ${sessionId} after chat completion`);
      const response = await axiosInstance.get(`/chat-sessions/${sessionId}`);
      const updatedSession = response.data.session;
      
      // Update the sessions list with the updated session
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === sessionId ? updatedSession : session
        )
      );
      
      // Also update the selected session if it's the one that was refreshed
      if (selectedSession?.id === sessionId) {
        setSelectedSession(updatedSession);
      }
      
      console.log('Session refreshed successfully:', updatedSession);
    } catch (error) {
      console.error(`Error refreshing session ${sessionId}:`, error);
    }
  };
  
  // Create a debounced version to avoid multiple refreshes
  const debouncedRefreshSession = useCallback(
    debounce((sessionId) => refreshSessionById(sessionId), 1000),
    []
  );

  // Create a function to refresh all sessions
  const refreshAllSessions = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/chat-sessions/');
      setSessions(response.data?.sessions || []);
      console.log('All sessions refreshed');
    } catch (error) {
      console.error('Error refreshing all sessions:', error);
    }
  }, []);
  
  // Debounced version for all sessions refresh
  const debouncedRefreshAllSessions = useCallback(
    debounce(() => refreshAllSessions(), 1000),
    [refreshAllSessions]
  );
  
  // Handler for chat completion notification
  const handleChatComplete = useCallback((sessionId) => {
    // First refresh just the completed session
    debouncedRefreshSession(sessionId);
    
    // Then refresh all sessions after a longer delay
    setTimeout(() => {
      debouncedRefreshAllSessions();
    }, 2000);
  }, [debouncedRefreshSession, debouncedRefreshAllSessions]);

  return (
    <Container fluid className="ai-chat-container">
      <Row className="h-100">
        <Col md={3} className="ai-chat-sidebar">
          <ChatList
            sessions={sessions}
            selectedSession={selectedSession}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
            loading={loading}
            onNewChat={handleNewChat}
          />
        </Col>
        <Col md={9} className="ai-chat-main">
          <ChatWindow
            session={selectedSession}
            onSessionCreated={(newSession) => {
              setSessions([newSession, ...sessions]);
              setSelectedSession(newSession);
              // Update URL when a new session is created
              navigate(`/ai-chat/${newSession.id}`);
            }}
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
            loading={loading}
            onChatComplete={handleChatComplete}
          />
        </Col>
      </Row>
    </Container>
  );
}

export default AIChat;
