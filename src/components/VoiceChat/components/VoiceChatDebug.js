import React from 'react';
import { Card, Button, Alert, Form } from 'react-bootstrap';
import { Users } from 'lucide-react';
import { RTVIClientProvider, RTVIClientAudio } from '@pipecat-ai/client-react';

export const VoiceChatDebug = ({
  isConnected,
  isConnecting,
  error,
  connectionState,
  participants,
  userAudioLevel,
  botAudioLevel,
  isUserSpeaking,
  isBotSpeaking,
  debugMessages,
  showDebug,
  setShowDebug,
  handleConnectionToggle,
  clientRef,
}) => {
  const getCurrentStatus = () => {
    if (!isConnected) return 'disconnected';
    if (participants.length === 0) return 'waiting';
    return 'ready';
  };

  return (
    <Card className="p-4">
      <Card.Body>
        <h2>Voice Chat Debug</h2>
        
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
          <div className="audio-level-indicator">
            <div className="audio-level-label">
              <span>You</span>
            </div>
            <div className="audio-level-bar">
              <div 
                className="audio-level-fill"
                style={{ 
                  width: `${userAudioLevel * 100}%`,
                  opacity: isUserSpeaking ? 1 : 0.5
                }}
              />
            </div>
          </div>
          <div className="audio-level-indicator">
            <div className="audio-level-label">
              <span>Bot</span>
            </div>
            <div className="audio-level-bar">
              <div 
                className="audio-level-fill"
                style={{ 
                  width: `${botAudioLevel * 100}%`,
                  opacity: isBotSpeaking ? 1 : 0.5
                }}
              />
            </div>
          </div>
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
          <Button
            variant={isConnected ? "danger" : "primary"}
            onClick={handleConnectionToggle}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
          </Button>
        </div>

        {/* Audio Provider */}
        {clientRef.current && (
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