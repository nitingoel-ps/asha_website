import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import axiosInstance from '../../utils/axiosInstance';
import './AIChat.css';

function AIChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  
  // Store the initial message in component state instead of relying on location.state
  // This ensures we don't lose it when location.state changes
  const [storedInitialMessage, setStoredInitialMessage] = useState(location.state?.initialMessage);
  
  console.log('AIChat component loaded with initialMessage:', storedInitialMessage);
  console.log('Location state:', location.state);

  // Only fetch sessions on initial mount, don't clear state yet
  useEffect(() => {
    console.log('Initial mount effect running');
    fetchSessions();
  }, []);

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
    try {
      setLoading(true);
      const response = await axiosInstance.post('/chat-sessions/', {
        session_name: 'New Chat' // Default name for new chat sessions
      });
      const newSession = response.data;
      setSessions([newSession, ...sessions]);
      setSelectedSession(newSession);
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
    } catch (error) {
      console.error('Error creating new chat session with message:', error);
    } finally {
      setLoading(false);
      console.log('Setting loading to false after creating session');
    }
  };

  const handleSelectSession = async (session) => {
    setLoading(true);
    try {
      // Fetch fresh session data to ensure we have latest messages
      const response = await axiosInstance.get(`/chat-sessions/${session.id}`);
      setSelectedSession(response.data.session); // Access the session object from response
    } catch (error) {
      console.error('Error fetching session details:', error);
      // Fall back to using the session data we already have
      setSelectedSession(session);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await axiosInstance.delete(`/chat-sessions/${sessionId}/delete/`);
      setSessions(sessions.filter(session => session.id !== sessionId));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
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

  return (
    <Container fluid className="ai-chat-container">
      <Row className="h-100">
        <Col md={3} className="ai-chat-sidebar">
          <div className="d-grid gap-2 mb-3">
            <Button variant="primary" onClick={handleNewChat}>
              New Chat
            </Button>
          </div>
          <ChatList
            sessions={sessions}
            selectedSession={selectedSession}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
            loading={loading}
          />
        </Col>
        <Col md={9} className="ai-chat-main">
          <ChatWindow
            session={selectedSession}
            onSessionCreated={(newSession) => {
              setSessions([newSession, ...sessions]);
              setSelectedSession(newSession);
            }}
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
            loading={loading}
          />
        </Col>
      </Row>
    </Container>
  );
}

export default AIChat;
