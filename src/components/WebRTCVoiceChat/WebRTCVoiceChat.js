import React, { useState } from 'react';
import { VoiceChat } from '../VoiceChat';
import { useVoiceChat } from '../VoiceChat';
import { Button } from 'react-bootstrap';

const WebRTCVoiceChat = () => {
  const [showDebug, setShowDebug] = useState(true);
  const {
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
    connect,
    disconnect,
    handleConnectionToggle,
    addDebugMessage
  } = useVoiceChat();

  return (
    <div style={{ marginTop: '60px' }}>
      <div className="mb-3">
        <Button
          variant={isConnected ? "danger" : "primary"}
          onClick={isConnected ? disconnect : connect}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
        </Button>
        <Button
          variant="outline-secondary"
          className="ms-2"
          onClick={() => setShowDebug(!showDebug)}
        >
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </Button>
      </div>
      <VoiceChat 
        showDebug={showDebug}
        isConnected={isConnected}
        isConnecting={isConnecting}
        error={error}
        connectionState={connectionState}
        isClientReady={isClientReady}
        participants={participants}
        userAudioLevel={userAudioLevel}
        botAudioLevel={botAudioLevel}
        isUserSpeaking={isUserSpeaking}
        isBotSpeaking={isBotSpeaking}
        isBotThinking={isBotThinking}
        debugMessages={debugMessages}
        clientRef={clientRef}
        handleConnectionToggle={handleConnectionToggle}
        addDebugMessage={addDebugMessage}
      />
    </div>
  );
};

export default WebRTCVoiceChat;