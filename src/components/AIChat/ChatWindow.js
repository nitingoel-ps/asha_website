import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Spinner } from 'react-bootstrap';
import axiosInstance from '../../utils/axiosInstance';
import MessageList from './MessageList';

function ChatWindow({ session, onSessionCreated }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messageEndRef = useRef(null);

  useEffect(() => {
    // Reset messages when switching sessions
    setMessages([]);
    
    if (session?.id) {
      fetchMessages(session.id);
    }
  }, [session]);

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

  return (
    <div className="chat-window">
      <div className="messages-container">
        <MessageList messages={messages} />
        <div ref={messageEndRef} />
      </div>
      <Form onSubmit={handleSend} className="message-input-form">
        <Form.Group className="d-flex">
          <Form.Control
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !newMessage.trim()}>
            {isLoading ? <Spinner size="sm" animation="border" /> : 'Send'}
          </Button>
        </Form.Group>
      </Form>
    </div>
  );
}

export default ChatWindow;
