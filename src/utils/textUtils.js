
/**
 * Removes text enclosed in square brackets (including nested brackets)
 * @param {string} text - The input text containing square brackets
 * @returns {string} - The text with all bracketed content removed
 */
export const removeSquareBrackets = (text) => {
  if (!text) return text;
  
  // Use a stack-based approach to handle nested brackets
  let result = '';
  let bracketCount = 0;
  
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[') {
      bracketCount++;
    } else if (text[i] === ']') {
      bracketCount--;
    } else if (bracketCount === 0) {
      // Only add characters to result when we're not inside brackets
      result += text[i];
    }
  }
  
  // Clean up any extra whitespace that might have been left
  return result.replace(/\s+/g, ' ').trim();
};

/**
 * Formats text for display by removing references in square brackets
 * and applying other clean-up as needed
 * @param {string} text - The input text to clean
 * @returns {string} - The cleaned text
 */
export const formatDisplayText = (text) => {
  if (!text) return '';
  
  // Remove square bracketed content
  const cleanText = removeSquareBrackets(text);
  
  // Additional formatting could be added here
  
  return cleanText;
};
