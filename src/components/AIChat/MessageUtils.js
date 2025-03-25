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

  // First, extract all reference numbers and their URLs from a references section if it exists
  const refMap = {};
  const referenceSection = content.match(/References:[\s\S]*$/i) || content.match(/Sources:[\s\S]*$/i);
  
  if (referenceSection) {
    // Extract the reference part of the content
    const referencePart = referenceSection[0];
    
    // Find all reference number and URL pairs in the reference section
    const refPattern = /\[(\d+)\]\s*((?:https?:\/\/[^\s]+)|(?:[^[\n]+))/g;
    let refMatch;
    
    while ((refMatch = refPattern.exec(referencePart)) !== null) {
      const refNumber = refMatch[1];
      const refContent = refMatch[2].trim();
      
      // Determine if the reference is a URL or text
      const isUrl = /^https?:\/\//.test(refContent);
      refMap[refNumber] = {
        content: refContent,
        isUrl: isUrl
      };
    }
  }
  
  // Replace [Ref: x/y, a/b, c/d] with multiple superscript links styled as references
  let updatedContent = content.replace(
    /\[Ref:\s*([^\]]+)\]/g, 
    (match, paths) => {
      // Split by commas and create a link for each path
      const pathArray = paths.split(',').map(p => p.trim());
      return pathArray.map(path => 
        `<sup><a class="ai-chat-reference" href="/patient-dashboard/${path}">[ref]</a></sup>`
      ).join(' ');
    }
  );
  
  // Handle case where citations are already HTML links inside sup tags
  updatedContent = updatedContent.replace(
    /<sup class="ai-chat-reference">\[<a href="(https?:\/\/[^"]+)">(\d+)<\/a>\]<\/sup>/g,
    (match, url, number) => 
      `<sup class="ai-chat-reference"><a href="${url}" target="_blank" rel="noopener noreferrer">[[${number}]]</a></sup>`
  );
  
  // Replace standalone reference numbers (e.g., [1], [2]) with clickable links that open in a new tab
  updatedContent = updatedContent.replace(
    /\[(\d+)\](?!:)/g,
    (match, number) => {
      // If we have this reference number in our map
      if (refMap[number]) {
        const ref = refMap[number];
        if (ref.isUrl) {
          // It's a URL, make it open in a new tab
          return `<sup class="ai-chat-reference"><a href="${ref.content}" target="_blank" rel="noopener noreferrer">[[${number}]]</a></sup>`;
        } else {
          // It's text, just style it
          return `<sup class="ai-chat-reference" title="${ref.content}">[[${number}]]</sup>`;
        }
      } else {
        // No reference found, just style it
        return `<sup class="ai-chat-reference">[[${number}]]</sup>`;
      }
    }
  );
  
  // Also make any URLs in the reference section clickable and open in a new tab
  if (referenceSection) {
    const referencePart = referenceSection[0];
    const updatedReferencePart = referencePart.replace(
      /(\[(\d+)\]\s*)(https?:\/\/[^\s]+)/g,
      (match, prefix, number, url) => `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    );
    updatedContent = updatedContent.replace(referencePart, updatedReferencePart);
  }
  
  return updatedContent;
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
