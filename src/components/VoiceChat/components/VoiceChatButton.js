import React from 'react';
import { useVoiceChatControls } from '../hooks/useVoiceChatControls';
import { Mic, Square } from 'lucide-react';
import { VoiceChat } from '../VoiceChat';
import { useMediaQuery } from 'react-responsive';

const VoiceChatButton = () => {
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
  } = useVoiceChatControls();

  const isMobile = useMediaQuery({ maxWidth: 991 });

  const handleClick = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await connect();
    }
  };

  if (isMobile) {
    return (
      <>
        <button
          className={`mobile-nav-item microphone-nav-item ${isConnected ? 'connected' : ''}`}
          onClick={handleClick}
          disabled={isConnecting}
        >
          <div className="microphone-icon">
            {isConnected ? (
              <Square size={24} />
            ) : (
              <Mic size={24} />
            )}
          </div>
          <span>{isConnected ? 'Stop' : 'Voice'}</span>
        </button>

        {/* Show VoiceChat component when either connected or connecting */}
        {(isConnected || isConnecting) && (
          <VoiceChat
            showDebug={false}
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
        )}
      </>
    );
  }

  // Desktop version
  return (
    <>
      <button
        className="top-navbar-item"
        onClick={handleClick}
        disabled={isConnecting}
        style={{ marginRight: '1rem' }}
      >
        {isConnected ? (
          <>
            <Square size={20} style={{ marginRight: '0.5rem' }} />
            Stop Voice
          </>
        ) : (
          <>
            <Mic size={20} style={{ marginRight: '0.5rem' }} />
            Start Voice
          </>
        )}
      </button>

      {/* Show VoiceChat component when either connected or connecting */}
      {(isConnected || isConnecting) && (
        <VoiceChat
          showDebug={false}
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
      )}
    </>
  );
};

export default VoiceChatButton; 