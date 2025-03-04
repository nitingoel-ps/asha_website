import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Spinner } from 'react-bootstrap';
import { FaPaperPlane, FaBars, FaPen } from 'react-icons/fa';
import axiosInstance from '../../utils/axiosInstance';
import MessageList from './MessageList';
import ChatList from './ChatList';

function ChatWindow({ session, onSessionCreated, sessions = [], onSelectSession, onDeleteSession, onRenameSession, loading }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatListVisible, setIsChatListVisible] = useState(false);
  const [initialMessageProcessed, setInitialMessageProcessed] = useState(false);
  const messageEndRef = useRef(null);

  useEffect(() => {
    console.log('ChatWindow loaded with sessions:', sessions);
    console.log('Selected session:', session);

    // Reset messages when switching sessions
    setMessages([]);
    setInitialMessageProcessed(false);
    
    if (session?.id) {
      fetchMessages(session.id);
    }
  }, [session, sessions]);

  // Handle initial message if present in the session
  useEffect(() => {
    if (session?.initialMessage && !initialMessageProcessed && messages.length === 0) {
      setNewMessage(session.initialMessage);
      // We don't auto-send here to let the user edit if needed,
      // but you could auto-send by uncommenting the next line
      // handleSend(new Event('submit'));
      setInitialMessageProcessed(true);
    }
  }, [session, messages, initialMessageProcessed]);

  const fetchMessages = async (sessionId) => {
    try {
      const response = await axiosInstance.get(`/chat-sessions/${sessionId}`);
      // Access messages through the session object
      const formattedMessages = response.data.session?.messages?.map(msg => ({
        role: msg.role || (msg.is_user ? 'user' : 'assistant'),
        content: msg.content || msg.text || '',
        isStreaming: false
      })) || [];
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages for session:', error);
      setMessages([]);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageToSend = newMessage;
    setNewMessage('');
    setIsLoading(true);

    // Add user message immediately
    setMessages(prev => [...prev, {
      role: 'user',
      content: messageToSend
    }]);

    try {
      let currentSessionId = session?.id;
      
      // If no session exists, create one
      if (!currentSessionId) {
        const sessionResponse = await axiosInstance.post('/chat-sessions/', {
          session_name: 'New Chat'
        });
        currentSessionId = sessionResponse.data.id;
        onSessionCreated(sessionResponse.data);
      }

      // Create messages array for API request
      const messageHistory = [
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: messageToSend }
      ];

      // Initialize streaming response
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/new-chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          messages: messageHistory,
          session_id: currentSessionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Initialize streaming response handling
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let inThinkBlock = false;
      let currentMessage = { role: 'assistant', content: '', isStreaming: true };

      // Add initial AI message
      setMessages(prev => [...prev, currentMessage]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        // Decode the chunk and add it to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines from buffer
        while (buffer.includes('\n')) {
          const newlineIndex = buffer.indexOf('\n');
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line) {
            // Update the current message content
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              
              if (lastMessage && lastMessage.isStreaming) {
                lastMessage.content = (lastMessage.content || '') + line + '\n';
                return [...newMessages];
              }
              return newMessages;
            });
          }
        }
      }

      // Handle any remaining content in buffer
      if (buffer.trim()) {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.isStreaming) {
            lastMessage.content = (lastMessage.content || '') + buffer.trim();
            lastMessage.isStreaming = false;
            return [...newMessages];
          }
          return newMessages;
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error sending your message.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.post('/chat-sessions/', {
        session_name: 'New Chat'
      });
      const newSession = response.data;
      onSessionCreated(newSession);
    } catch (error) {
      console.error('Error creating new chat session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-chat-window">
      <Button
        className="d-md-none toggle-chat-list-btn"
        onClick={() => setIsChatListVisible(!isChatListVisible)}
      >
        <FaBars size={20} />
      </Button>
      <Button
        className="d-md-none new-chat-btn"
        onClick={handleNewChat}
      >
        <FaPen size={20} />
      </Button>
      <div className={`ai-chat-sidebar ${isChatListVisible ? 'd-block' : 'd-none'}`}>
        <ChatList
          sessions={sessions}
          selectedSession={session}
          onSelectSession={(session) => {
            setIsChatListVisible(false);
            onSelectSession(session);
          }}
          onDeleteSession={onDeleteSession}
          onRenameSession={onRenameSession}
          loading={loading}
        />
      </div>
      <div className="ai-chat-messages-container">
        <MessageList messages={messages} />
        <div ref={messageEndRef} />
      </div>
      <Form onSubmit={handleSend} className="ai-chat-message-input-form">
        <Form.Group className="d-flex align-items-center">
          <Form.Control
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !newMessage.trim()} className="ms-2">
            {isLoading ? <Spinner size="sm" animation="border" /> : <FaPaperPlane size={20} />}
          </Button>
        </Form.Group>
      </Form>
    </div>
  );
}

export default ChatWindow;
