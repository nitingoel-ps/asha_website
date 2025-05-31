import React from 'react';
import { Volume2 } from 'lucide-react';
import './VoiceChatOverlay.css';
import { useEffect } from 'react';

export const VoiceChatOverlay = ({
  isConnected,
  isConnecting,
  isBotThinking,
  isBotSpeaking,
  isUserSpeaking,
  userAudioLevel,
  botAudioLevel,
  hasBotJoined,
}) => {

  const getStatusClass = () => {
    // Disconnected state takes precedence over all other states
    if (!isConnected && !isConnecting) return 'disconnected';
    
    // Other states in order of priority
    if (isConnecting) return 'connecting';
    if (isBotThinking) return 'thinking';
    if (isBotSpeaking) return 'bot-speaking';
    if (isUserSpeaking) return 'user-speaking';
    if (isConnected && hasBotJoined) return 'ready';
    if (isConnected && !hasBotJoined) return 'waiting';
    
    return 'disconnected';
  };

  return (
    <div className="voice-chat-overlay">
      <div className="overlay-container">
        <div className="overlay-content">
          <div className={`status-indicator ${getStatusClass()}`} />
          <div className="audio-levels">
            <div className="audio-level-row">
              <div className="audio-bar">
                <div 
                  className="audio-fill user"
                  style={{ 
                    width: `${Math.max(userAudioLevel * 100, 5)}%`,
                    opacity: isUserSpeaking ? 1 : 0.5
                  }}
                />
              </div>
            </div>
            <div className="audio-level-row">
              <div className="audio-bar">
                <div 
                  className="audio-fill bot"
                  style={{ 
                    width: `${Math.max(botAudioLevel * 100, 5)}%`,
                    opacity: isBotSpeaking ? 1 : 0.5
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 