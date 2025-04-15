// termsService.js - Utility for handling Terms of Service and Privacy Policy content

// Function to load Terms of Service HTML content
export const loadTermsOfService = async () => {
  try {
    const response = await fetch('/terms-of-service.html');
    if (!response.ok) {
      throw new Error('Failed to load Terms of Service');
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading Terms of Service:', error);
    return `
      <div>
        <h1>Terms of Service</h1>
        <p>We were unable to load the Terms of Service content. Please try again later.</p>
        <p>If the problem persists, please contact support.</p>
      </div>
    `;
  }
};

// Function to load Privacy Policy HTML content
export const loadPrivacyPolicy = async () => {
  try {
    const response = await fetch('/privacy-policy.html');
    if (!response.ok) {
      throw new Error('Failed to load Privacy Policy');
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading Privacy Policy:', error);
    return `
      <div>
        <h1>Privacy Policy</h1>
        <p>We were unable to load the Privacy Policy content. Please try again later.</p>
        <p>If the problem persists, please contact support.</p>
      </div>
    `;
  }
};

// Function to load either Terms of Service or Privacy Policy based on type
export const loadContent = async (type) => {
  if (type === 'terms') {
    return loadTermsOfService();
  } else if (type === 'privacy') {
    return loadPrivacyPolicy();
  } else {
    return 'Invalid content type requested.';
  }
}; 