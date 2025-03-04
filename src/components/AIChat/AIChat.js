import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import axiosInstance from '../../utils/axiosInstance';
import './AIChat.css';

function AIChat() {
  const location = useLocation();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  
  // Check for initial message from navigation state
  const initialMessage = location.state?.initialMessage;

  useEffect(() => {
    fetchSessions();
  }, []);

  // Effect for handling initial message
  useEffect(() => {
    if (initialMessage && !initialMessageSent && !loading) {
      handleNewChatWithMessage(initialMessage);
      setInitialMessageSent(true);
    }
  }, [initialMessage, initialMessageSent, loading]);

  const fetchSessions = async () => {
    try {
      const response = await axiosInstance.get('/chat-sessions/');
      // Ensure we're accessing the correct property from the response
      // and that we initialize with an empty array if data is null/undefined
      setSessions(response.data?.sessions || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      setSessions([]); // Initialize with empty array on error
      setLoading(false);
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
    try {
      setLoading(true);
      // First create a new session
      const response = await axiosInstance.post('/chat-sessions/', {
        session_name: message.substring(0, 30) + '...' // Use part of the message as the name
      });
      const newSession = response.data;
      
      // Update sessions and select the new one
      setSessions(prev => [newSession, ...prev]);
      setSelectedSession({
        ...newSession,
        initialMessage: message // Pass the message to the chat window
      });
    } catch (error) {
      console.error('Error creating new chat session with message:', error);
    } finally {
      setLoading(false);
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
