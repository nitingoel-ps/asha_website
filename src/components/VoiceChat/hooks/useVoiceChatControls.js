import { useVoiceChat } from './useVoiceChat';

export const useVoiceChatControls = () => {
  const voiceChat = useVoiceChat();
  
  // Helper function to get button props
  const getConnectionButtonProps = () => ({
    variant: voiceChat.isConnected ? "danger" : "primary",
    onClick: voiceChat.isConnected ? voiceChat.disconnect : voiceChat.connect,
    disabled: voiceChat.isConnecting,
    children: voiceChat.isConnecting ? 'Connecting...' : voiceChat.isConnected ? 'Disconnect' : 'Connect'
  });

  return {
    // Voice chat state and functions
    ...voiceChat,
    
    // UI helpers
    getConnectionButtonProps,
    
    // Connection status helpers
    isReady: voiceChat.isConnected && !voiceChat.isConnecting,
    isError: !!voiceChat.error,
    
    // Audio status helpers
    isAudioActive: voiceChat.isUserSpeaking || voiceChat.isBotSpeaking,
    isBotActive: voiceChat.isBotSpeaking || voiceChat.isBotThinking
  };
}; 