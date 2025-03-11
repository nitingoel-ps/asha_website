/**
 * Utility functions for handling special message formats in the chat
 */

/**
 * Checks if a message is an activity indicator message (<<...>>)
 * @param {string} content - The message content
 * @returns {boolean} - True if the message is an activity indicator
 */
export const isActivityMessage = (content) => {
  return content && /^<<.*>>$/.test(content.trim());
};

/**
 * Extracts the text from an activity message
 * @param {string} content - The activity message content
 * @returns {string} - The extracted text
 */
export const extractActivityText = (content) => {
  return content.replace(/^<<|>>$/g, '').trim();
};

/**
 * Processes reference links in the format [Ref: xxx/yyy]
 * @param {string} content - The message content
 * @returns {string} - The content with properly formatted reference links
 */
export const processReferenceLinks = (content) => {
  if (!content) return '';
  
  // Replace [Ref: x/y] with <sup><a href="/patient-dashboard/x/y">[ref]</a></sup>
  return content.replace(
    /\[Ref:\s*([^\]]+)\]/g, 
    (match, path) => `<sup><a href="/patient-dashboard/${path.trim()}">[ref]</a></sup>`
  );
};

/**
 * Parses content and segments it into regular text and activity indicators
 * @param {string} content - The message content
 * @returns {Array} - Array of segments with type and text
 */
export const parseContentWithActivities = (content) => {
  if (!content) return [];
  
  // Regular expression to match <<...>> patterns
  const activityPattern = /<<([^>]*)>>/g;
  const segments = [];
  let lastIndex = 0;
  let match;
  
  // Find all activity indicators and split the content accordingly
  while ((match = activityPattern.exec(content)) !== null) {
    // Add text before the activity indicator (if any)
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: content.substring(lastIndex, match.index)
      });
    }
    
    // Add the activity indicator
    segments.push({
      type: 'activity',
      content: match[1] // The text inside <<...>>
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last activity indicator (if any)
  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      content: content.substring(lastIndex)
    });
  }
  
  return segments;
};

/**
 * Process streaming content, handling activity indicators within the message
 * @param {Array} messages - Current messages array
 * @param {string} newContent - New content received from streaming
 * @param {number} messageIndex - Index of the message being updated
 * @returns {Array} - Updated messages array
 */
export const processStreamingContent = (messages, newContent, messageIndex) => {
  // Create a copy of the messages array to modify
  const updatedMessages = [...messages];
  const currentMessage = updatedMessages[messageIndex];
  
  // Just append the new content - we'll parse it when rendering
  updatedMessages[messageIndex] = {
    ...currentMessage,
    content: currentMessage ? (currentMessage.content || '') + newContent : newContent,
    isStreaming: true
  };
  
  return updatedMessages;
};

export default {
  isActivityMessage,
  extractActivityText,
  processReferenceLinks,
  parseContentWithActivities,
  processStreamingContent
};
