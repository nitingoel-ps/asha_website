import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { FiThumbsUp, FiThumbsDown, FiShare2 } from 'react-icons/fi';
import axiosInstance from '../../utils/axiosInstance';
import FeedbackModal from './FeedbackModal';

/**
 * Component to display feedback controls (helpful, not helpful, share) for AI messages
 */
const MessageFeedback = ({ messageId, sessionId, initialFeedback = null }) => {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Update feedback state if initialFeedback changes (e.g., from server)
  useEffect(() => {
    if (initialFeedback !== null) {
      setFeedback(initialFeedback);
    }
  }, [initialFeedback]);

  // Handle helpful/not helpful feedback
  const handleFeedback = async (isHelpful) => {
    if (isSubmitting) return;
    
    // If the user clicks the already selected feedback, do nothing
    if (feedback === isHelpful) return;
    
    if (!isHelpful) {
      // Always show the feedback modal when clicking "Not Helpful", regardless of previous state
      setFeedback(false); // Immediately update UI to show the button as selected
      setShowFeedbackModal(true);
      return;
    }
    
    // For positive feedback, submit right away
    setIsSubmitting(true);
    try {
      // Call API to record the feedback
      if (sessionId && messageId) {
        await axiosInstance.post('/chat-message-feedback/', {
          session_id: sessionId,
          message_id: messageId,
          is_helpful: isHelpful
        });
      }
      // Update local state to show the selection
      setFeedback(isHelpful);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle additional feedback submission
  const handleAdditionalFeedback = async (context) => {
    setIsSubmitting(true);
    try {
      // Call API to record the negative feedback with context
      if (sessionId && messageId) {
        await axiosInstance.post('/chat-message-feedback/', {
          session_id: sessionId,
          message_id: messageId,
          is_helpful: false,
          context: context // Include the additional feedback as context
        });
      }
      
      // Close the modal after submission
      setShowFeedbackModal(false);
    } catch (error) {
      console.error('Error submitting additional feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle share functionality
  const handleShare = async () => {
    // Check if the Web Share API is available
    if (navigator.share) {
      try {
        // Get the message content from the DOM (parent element)
        const messageElement = document.getElementById(`ai-message-${messageId}`);
        const messageText = messageElement ? messageElement.textContent : 'AI response';
        
        await navigator.share({
          title: 'Shared from MyHealthChat',
          text: messageText,
          // Optional URL to your app
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      alert('Sharing is not supported in your browser');
      // Could implement a custom share dialog here instead
    }
  };

  return (
    <>
      <div className="message-feedback-controls">
        <Button 
          variant="link" 
          className={`feedback-btn ${feedback === true ? 'active' : ''}`}
          onClick={() => handleFeedback(true)}
          disabled={isSubmitting}
          aria-label="Helpful"
        >
          <FiThumbsUp /> Helpful
        </Button>
        
        <Button 
          variant="link" 
          className={`feedback-btn ${feedback === false ? 'active' : ''}`}
          onClick={() => handleFeedback(false)}
          disabled={isSubmitting}
          aria-label="Not Helpful"
        >
          <FiThumbsDown /> Not Helpful
        </Button>
        
        <Button 
          variant="link" 
          className="share-btn"
          onClick={handleShare}
          aria-label="Share"
        >
          <FiShare2 /> Share
        </Button>
      </div>

      {/* Modal for collecting additional feedback */}
      <FeedbackModal
        show={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleAdditionalFeedback}
        isSubmitting={isSubmitting}
      />
    </>
  );
};

export default MessageFeedback; 