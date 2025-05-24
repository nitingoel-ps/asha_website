import React, { useState } from 'react';
import { VoiceChatOverlay } from './components/VoiceChatOverlay';
import { VoiceChatDebug } from './components/VoiceChatDebug';
import './VoiceChat.css';

export const VoiceChat = ({ 
  showDebug = false,
  // Voice chat state and functions
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
  handleConnectionToggle,
  addDebugMessage
}) => {
  const [showDebugMessages, setShowDebugMessages] = useState(showDebug);

  return (
    <>
      <VoiceChatOverlay
        isConnected={isConnected}
        isConnecting={isConnecting}
        isBotThinking={isBotThinking}
        isBotSpeaking={isBotSpeaking}
        isUserSpeaking={isUserSpeaking}
        userAudioLevel={userAudioLevel}
        botAudioLevel={botAudioLevel}
      />
      
      {showDebugMessages && (
        <VoiceChatDebug
          isConnected={isConnected}
          isConnecting={isConnecting}
          error={error}
          connectionState={connectionState}
          participants={participants}
          userAudioLevel={userAudioLevel}
          botAudioLevel={botAudioLevel}
          isUserSpeaking={isUserSpeaking}
          isBotSpeaking={isBotSpeaking}
          debugMessages={debugMessages}
          showDebug={showDebugMessages}
          setShowDebug={setShowDebugMessages}
          handleConnectionToggle={handleConnectionToggle}
          clientRef={clientRef}
        />
      )}
    </>
  );
}; 