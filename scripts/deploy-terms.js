// scripts/deploy-terms.js
// A simple Node.js script to copy Terms and Privacy files to the public directory

const fs = require('fs');
const path = require('path');

// Source file paths
const termsOfServicePath = path.resolve(__dirname, '../src/components/NewRegistration/TermsOfService.html');
const privacyPolicyPath = path.resolve(__dirname, '../src/components/NewRegistration/PrivacyPolicy.html');

// Destination file paths in the public directory
const publicTermsPath = path.resolve(__dirname, '../public/terms-of-service.html');
const publicPrivacyPath = path.resolve(__dirname, '../public/privacy-policy.html');

// Ensure the public directory exists
const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy Terms of Service
try {
  const termsContent = fs.readFileSync(termsOfServicePath, 'utf8');
  fs.writeFileSync(publicTermsPath, termsContent);
  console.log('Terms of Service copied to public directory successfully.');
} catch (error) {
  console.error('Error copying Terms of Service:', error);
}

// Copy Privacy Policy
try {
  const privacyContent = fs.readFileSync(privacyPolicyPath, 'utf8');
  fs.writeFileSync(publicPrivacyPath, privacyContent);
  console.log('Privacy Policy copied to public directory successfully.');
} catch (error) {
  console.error('Error copying Privacy Policy:', error);
}

console.log('Deployment of Terms and Privacy files complete.'); 