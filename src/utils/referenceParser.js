/**
 * Converts reference patterns like [xxx/yyy] to appropriate links
 * @param {string} reference - The reference string in format [xxx/yyy]
 * @returns {string} The URL path for the reference
 */
export const referenceToLink = (reference) => {
  // Remove brackets
  const cleanReference = reference.replace(/[\[\]]/g, '');
  console.log("Clean reference:", cleanReference);
  
  // Handle special case for lab findings
  if (cleanReference.startsWith('StdLab/')) {
    return `/patient-dashboard/observation/${cleanReference.replace('StdLab/', '')}`;
  }
  
  // Default case
  return `/patient-dashboard/${cleanReference}`;
};

/**
 * Parses text and converts reference patterns to link objects
 * @param {string} text - Text containing references like [xxx/yyy]
 * @returns {Array} Array of text segments and link objects
 */
export const parseReferences = (text) => {
  if (!text) return [];
  
  // Ensure text is a string
  const safeText = String(text);
  console.log("Parsing text for references:", safeText);
  
  // Regex to match [xxx/yyy] patterns - this pattern needs to be more specific
  const referenceRegex = /(\[[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\])/g;
  
  // Check if text contains references
  const hasReferences = referenceRegex.test(safeText);
  console.log("Contains references:", hasReferences);
  
  // Reset regex since test() advances the lastIndex
  referenceRegex.lastIndex = 0;
  
  if (!hasReferences) {
    return [{ type: 'text', text: safeText, key: 'text-full' }];
  }
  
  // Find all matches
  const matches = safeText.match(referenceRegex) || [];
  console.log("Found reference matches:", matches);
  
  // Split text by references
  const segments = safeText.split(referenceRegex);
  console.log("Split segments:", segments);
  
  // Process each segment
  return segments.map((segment, index) => {
    // Check if segment matches reference pattern
    if (referenceRegex.test(segment)) {
      console.log("Converting segment to link:", segment);
      return {
        type: 'link',
        text: segment,
        url: referenceToLink(segment),
        key: `ref-${index}`
      };
    }
    
    // Regular text
    return {
      type: 'text',
      text: segment,
      key: `text-${index}`
    };
  });
};
