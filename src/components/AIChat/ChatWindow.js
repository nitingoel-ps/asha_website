import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Form, Button, Spinner } from 'react-bootstrap';
import { FiMenu, FiPlus, FiMic, FiSend, FiEdit, FiList } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import MessageList from './MessageList';
import ChatList from './ChatList';
import { processStreamingContent, isActivityMessage } from './MessageUtils';
import { aiChatEvents } from '../../components/Navigation/LoggedInNavbar';


function ChatWindow({ session, onSessionCreated, sessions = [], onSelectSession, onDeleteSession, onRenameSession, loading, onChatComplete }) {
  const navigate = useNavigate(); // Add React Router's navigate hook
  const { sessionId } = useParams(); // Get session ID from URL
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatListVisible, setIsChatListVisible] = useState(false);
  const [initialMessageProcessed, setInitialMessageProcessed] = useState(false);
  const messageEndRef = useRef(null);
  const messagesRef = useRef([]);
  const urlSessionProcessedRef = useRef(false);
  
  // Create a ref for the form to trigger submit programmatically
  const formRef = useRef(null);

  // Debug logs for session changes
  useEffect(() => {
    console.log('ChatWindow loaded with sessions:', sessions);
    console.log('Selected session:', session);
    console.log('Initial message in session:', session?.initialMessage);
    console.log('initialMessageProcessed:', initialMessageProcessed);
    console.log('isLoading:', isLoading);
    console.log('URL sessionId:', sessionId);

    // Reset messages when switching sessions
    setMessages([]);
    setInitialMessageProcessed(false);
    
    if (session?.id) {
      fetchMessages(session.id);
    } else if (sessionId && sessions.length > 0 && !urlSessionProcessedRef.current) {
      // If we have a URL sessionId but no selected session, try to find and select it
      // Only do this once to prevent loops
      const sessionFromUrl = sessions.find(s => s.id === sessionId || s.id === parseInt(sessionId));
      if (sessionFromUrl && onSelectSession) {
        console.log('Found session from URL, selecting it:', sessionFromUrl);
        urlSessionProcessedRef.current = true;
        onSelectSession(sessionFromUrl);
      }
    }
  }, [session, sessions]);

  // Listen for mobile top bar events
  useEffect(() => {
    // Handle toggle chat list event from mobile top bar
    const handleToggleChatList = () => {
      setIsChatListVisible(!isChatListVisible);
    };
    
    // Handle new chat event from mobile top bar
    const handleNewChat = () => {
      handleNewChatClick();
    };
    
    // Add event listeners
    window.addEventListener(aiChatEvents.TOGGLE_CHAT_LIST, handleToggleChatList);
    window.addEventListener(aiChatEvents.NEW_CHAT, handleNewChat);
    
    // Clean up
    return () => {
      window.removeEventListener(aiChatEvents.TOGGLE_CHAT_LIST, handleToggleChatList);
      window.removeEventListener(aiChatEvents.NEW_CHAT, handleNewChat);
    };
  }, [isChatListVisible]); // Include isChatListVisible to update the toggle function when it changes

  // Sync the ref with state whenever messages change
  useEffect(() => {
    messagesRef.current = messages;
    console.log('Messages ref updated:', messagesRef.current);
  }, [messages]);

  // Modified approach for auto-submitting the initial message
  useEffect(() => {
    console.log('Auto-send effect triggered with: ', {
      hasInitialMessage: Boolean(session?.initialMessage),
      initialMessageProcessed,
      isLoading
    });
    
    if (session?.initialMessage && !initialMessageProcessed && !isLoading) {
      console.log('Processing initial message:', session.initialMessage);
      
      // Add user message to display first - keep this message stable
      const updatedMessages = [
        ...messagesRef.current,
        {
          role: 'user',
          content: session.initialMessage,
          isInitialMessage: true
        }
      ];
      
      // Update both state and ref
      setMessages(updatedMessages);
      messagesRef.current = updatedMessages;
      
      console.log('Added initial user message:', updatedMessages);
      
      // Then send the message
      handleSendImmediately(session.initialMessage);
      setInitialMessageProcessed(true);
      console.log('Set initialMessageProcessed to true');
    }
  }, [session]);

  // Add a separate function to directly send a message without relying on form state
  const handleSendImmediately = (messageText) => {
    console.log('handleSendImmediately called with:', messageText);
    if (!messageText.trim()) {
      console.log('Message is empty, not sending');
      return;
    }

    setIsLoading(true);

    // Don't add user message here again - it's already added in the effect
    // We'll send the message to API directly
    sendMessageToAPI(messageText);
  };

  // Separate API communication logic for reusability
  const sendMessageToAPI = async (messageText) => {
    try {
      let currentSessionId = session?.id;
      console.log('Current session ID:', currentSessionId);
      
      if (!currentSessionId) {
        console.log('No session ID, creating new session');
        const sessionResponse = await axiosInstance.post('/chat-sessions/', {
          session_name: 'New Chat'
        });
        currentSessionId = sessionResponse.data.id;
        console.log('Created session with ID:', currentSessionId);
        onSessionCreated(sessionResponse.data);
      }

      // Create messages array for API request - ensure we use the ref which has the latest state
      const currentMessages = [...messagesRef.current];
      console.log('Current messages from ref for API request:', currentMessages);
      
      // Check if the user message is already included
      const userMessageAlreadyIncluded = currentMessages.some(
        msg => msg.role === 'user' && msg.content === messageText
      );
      
      const messageHistory = [
        ...currentMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        // Only add the user message if it's not already included
        ...(userMessageAlreadyIncluded ? [] : [{ role: 'user', content: messageText }])
      ];

      console.log('Sending message history:', messageHistory);

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
      
      console.log('Got response from API, starting streaming');

      // Initialize streaming response handling
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      // CRITICAL FIX: Use the ref instead of state for the latest messages
      const existingMessages = [...messagesRef.current];
      console.log('Existing messages before streaming (from ref):', existingMessages);
      
      // Create assistant message to append
      const assistantMessage = { role: 'assistant', content: '', isStreaming: true };
      
      // Ensure we have the user message in the array
      let messagesToUpdate = [...existingMessages];
      
      // If no user message is found, add it first
      if (!messagesToUpdate.some(msg => msg.role === 'user' && msg.content === messageText)) {
        console.log('User message not found, adding it first');
        messagesToUpdate.push({ role: 'user', content: messageText });
      }
      
      // Then add the assistant message
      messagesToUpdate.push(assistantMessage);
      
      // Update state and ref
      setMessages(messagesToUpdate);
      messagesRef.current = messagesToUpdate;
      
      console.log('Added assistant message to existing messages');
      console.log('Messages array should now have:', messagesToUpdate.length, 'messages');

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log('Stream complete');
          break;
        }
        
        // Decode the chunk and add it to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        console.log('Received chunk:', chunk);

        // Process complete lines from buffer
        while (buffer.includes('\n')) {
          const newlineIndex = buffer.indexOf('\n');
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line) {
            console.log('Processing line:', line);
            
            // Use processStreamingContent to properly handle activity messages
            setMessages(prev => {
              const newMessages = [...prev];
              // Find the streaming message (it should be the last one)
              const aiMessageIndex = newMessages.findIndex(
                msg => msg.role === 'assistant' && msg.isStreaming
              );
              
              if (aiMessageIndex >= 0) {
                // Use our utility to properly handle activity indicators
                return processStreamingContent(newMessages, line + '\n', aiMessageIndex);
              }
              
              return prev; // Return unchanged if no streaming message found
            });
          }
        }
      }

      // Handle any remaining content in buffer
      if (buffer.trim()) {
        console.log('Processing remaining buffer:', buffer.trim());
        setMessages(prev => {
          const newMessages = [...prev];
          const aiMessageIndex = newMessages.findIndex(
            msg => msg.role === 'assistant' && msg.isStreaming
          );
          
          if (aiMessageIndex >= 0) {
            // Use our utility one more time for remaining buffer
            const processedMessages = processStreamingContent(newMessages, buffer.trim(), aiMessageIndex);
            // Mark streaming as complete
            processedMessages[aiMessageIndex].isStreaming = false;
            
            // Also update the session object locally with new messages to avoid needing a refresh
            if (session) {
              session.messages = processedMessages.map(msg => ({
                role: msg.role,
                content: msg.content
              }));
            }
            
            return processedMessages;
          }
          
          return prev;
        });
      }

      // Ensure the streaming flag is turned off
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.isStreaming) {
          lastMessage.isStreaming = false;
          return newMessages;
        }
        return prev;
      });

      // Notify parent that chat is complete - add this
      if (onChatComplete && currentSessionId) {
        console.log('Chat complete, delaying session refresh to avoid UI flashing');
        // Delay the refresh callback to ensure UI has stabilized first
        setTimeout(() => {
          onChatComplete(currentSessionId);
        }, 500);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      // Add the error message without replacing existing ones
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error sending your message.'
      }]);
    } finally {
      setIsLoading(false);
      console.log('Message sending process complete');
    }
  };

  // Regular form submit handler
  const handleSend = async (e) => {
    console.log('handleSend called with event:', e);
    console.log('Current newMessage:', newMessage);
    
    e.preventDefault();
    if (!newMessage.trim()) {
      console.log('Message is empty, not sending');
      return;
    }

    const messageToSend = newMessage;
    setNewMessage('');
    setIsLoading(true);

    // Add user message immediately and update ref
    const updatedMessages = [...messagesRef.current, {
      role: 'user',
      content: messageToSend
    }];
    
    setMessages(updatedMessages);
    messagesRef.current = updatedMessages;
    
    console.log('Added user message:', updatedMessages);

    // Use the common API function
    await sendMessageToAPI(messageToSend);
  };

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
      messagesRef.current = formattedMessages;
    } catch (error) {
      console.error('Error fetching messages for session:', error);
      setMessages([]);
      messagesRef.current = [];
    }
  };

  // Debug effect to monitor newMessage changes
  useEffect(() => {
    console.log('newMessage changed to:', newMessage);
  }, [newMessage]);

  // Scroll to bottom when messages change
  useEffect(() => {
    console.log('Messages changed:', messages);
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Add this effect to handle viewport height issues on mobile
  useEffect(() => {
    function updateMobileViewportHeight() {
      // Set a custom property with the viewport height
      document.documentElement.style.setProperty(
        '--vh', 
        `${window.innerHeight * 0.01}px`
      );
    }
    
    // Update on mount
    updateMobileViewportHeight();
    
    // Add resize and orientation change listeners
    window.addEventListener('resize', updateMobileViewportHeight);
    window.addEventListener('orientationchange', updateMobileViewportHeight);
    
    return () => {
      window.removeEventListener('resize', updateMobileViewportHeight);
      window.removeEventListener('orientationchange', updateMobileViewportHeight);
    };
  }, []);

  // Add function to handle the new chat button click
  const handleNewChatClick = () => {
    if (sessions.length > 0 && onSelectSession) {
      // For simplicity, just redirect to base chat path
      // The parent component will handle creating a new chat
      navigate('/ai-chat');
      // If we're in mobile view, hide the chat list
      setIsChatListVisible(false);
      
      // Create new session if onSessionCreated is provided
      if (onSessionCreated) {
        handleNewChatRequest();
      }
    }
  };

  // Function to create a new chat session
  const handleNewChatRequest = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.post('/chat-sessions/', {
        session_name: 'New Chat'
      });
      const newSession = response.data;
      
      // Call the callback to update the parent component
      onSessionCreated(newSession);
    } catch (error) {
      console.error('Error creating new chat session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle navigation to voice streaming page
  const handleMicrophoneClick = () => {
    // If we have a current session, pass its ID to the voice chat page
    if (session?.id) {
      navigate(`/websocket-voice?session_id=${session.id}`);
    } else {
      navigate('/websocket-voice');
    }
  };

  const handleToggleChat = (session) => {
    // If selecting a session, close the chat list
    if (session) {
      setIsChatListVisible(false);
      onSelectSession(session);
    }
  };

  return (
    <div className="ai-chat-window">
      {/* Microphone button - only visible on desktop/tablet */}
      <Button
        className="mic-btn d-none d-md-flex"
        onClick={handleMicrophoneClick}
        aria-label="Switch to voice chat"
        variant="link"
      >
        <FiMic size={24} />
      </Button>
      
      <div className={`ai-chat-sidebar ${isChatListVisible ? 'd-block' : 'd-none'}`}>
        <ChatList
          sessions={sessions}
          selectedSession={session}
          onSelectSession={handleToggleChat}
          onDeleteSession={onDeleteSession}
          onRenameSession={onRenameSession}
          loading={loading}
        />
      </div>
      <div className="ai-chat-messages-container">
        {loading && !session ? (
          <div className="text-center p-5">
            <Spinner animation="border" />
            <p className="mt-3">Loading your most recent conversation...</p>
          </div>
        ) : !session && sessions.length === 0 ? (
          <div className="text-center p-5">
            <p>Welcome to AI Chat! Start a new conversation to begin.</p>
            <Button 
              variant="primary" 
              onClick={handleNewChatClick}
              className="mt-3"
            >
              <FiPlus className="me-2" /> New Chat
            </Button>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
        <div ref={messageEndRef} />
      </div>
      <Form ref={formRef} onSubmit={handleSend} className="ai-chat-message-input-form">
        <Form.Group className="d-flex align-items-center">
          <Form.Control
            type="text"
            name="message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading || !session}
          />
          <Button 
            type="submit" 
            disabled={isLoading || !newMessage.trim() || !session} 
            className="ms-2"
            onClick={() => console.log('Send button clicked')}
          >
            {isLoading ? <Spinner size="sm" animation="border" /> : <FiSend size={20} />}
          </Button>
        </Form.Group>
      </Form>
    </div>
  );
}

export default ChatWindow;
