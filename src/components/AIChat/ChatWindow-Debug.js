/**
 * This is a debugging utility for the ChatWindow component.
 * It's meant to be used temporarily to diagnose message handling issues.
 */

// Install this hook in your component to debug messages array changes
export const useMessageDebugger = (messages) => {
  React.useEffect(() => {
    console.log('%c Current Messages Array:', 'background: #222; color: #bada55', 
      messages.map((msg, i) => ({
        index: i,
        role: msg.role,
        contentPreview: msg.content?.substring(0, 30) + (msg.content?.length > 30 ? '...' : ''),
        isStreaming: !!msg.isStreaming,
        isInitialMessage: !!msg.isInitialMessage
      }))
    );
  }, [messages]);
};

// Helper to trace message array changes
export const traceMessages = (location, messages) => {
  console.group(`Messages at ${location}`);
  console.log('Message count:', messages.length);
  messages.forEach((msg, i) => {
    console.log(`[${i}] ${msg.role}: ${msg.content?.substring(0, 30)}... ${msg.isStreaming ? '(streaming)' : ''}`);
  });
  console.groupEnd();
};

export default { useMessageDebugger, traceMessages };
