# Multi-Step Registration Flow

This directory contains a modern, multi-step registration flow with email verification and terms acceptance.

## Components

- `RegistrationFlow.js` - Main container component that manages state and step navigation
- `EmailPasswordStep.js` - Step 1: Email and password collection, terms acceptance
- `VerificationStep.js` - Step 2: Email verification with 6-digit code
- `ProfileInfoStep.js` - Step 3: User profile information collection
- `ReviewStep.js` - Step 4: Information review and final submission
- `TermsAndPrivacyModal.js` - Modal for displaying Terms of Service and Privacy Policy
- `TermsOfService.html` - Placeholder template for Terms of Service content
- `PrivacyPolicy.html` - Placeholder template for Privacy Policy content
- `termsService.js` - Utility for loading terms and privacy content
- `RegistrationFlow.css` - Styles for the registration flow

## Required Backend APIs

The multi-step registration process requires the following API endpoints:

1. **Validate Registration Code**
   - Endpoint: `/validate/registration-code/`
   - Method: POST
   - Payload: `{ code: string }`
   - Response: Success status

2. **Check Email & Send Verification Code**
   - Endpoint: `/auth/check-email/`
   - Method: POST
   - Payload: `{ email: string, password: string, invitation_code: string }`
   - Response: `{ success: boolean, message: string, sessionToken: string }`

3. **Verify Code**
   - Endpoint: `/auth/verify-code/`
   - Method: POST
   - Payload: `{ code: string, sessionToken: string }`
   - Response: `{ success: boolean, verified: boolean, message: string }`

4. **Resend Verification Code**
   - Endpoint: `/auth/resend-code/`
   - Method: POST
   - Payload: `{ email: string }`
   - Response: Success status

5. **Complete Registration**
   - Endpoint: `/auth/register/`
   - Method: POST
   - Payload: `{ firstName: string, lastName: string, sessionToken: string, invitation_code: string }`
   - Response: `{ success: boolean, userId: string, message: string }`

## Terms and Privacy Content

The Terms of Service and Privacy Policy content is loaded from HTML files served from the public directory. 

To deploy these files to the public directory, run:

```
npm run deploy-terms
```

Or use the combined build command:

```
npm run build:all
```

## Updating Terms and Privacy Content

To update the Terms of Service or Privacy Policy content:

1. Edit the HTML files in `src/components/NewRegistration/`:
   - `TermsOfService.html`
   - `PrivacyPolicy.html`

2. Run the deployment script to copy these files to the public directory:
   ```
   npm run deploy-terms
   ```

3. Build and deploy the application.

## Usage

The registration flow is available at `/new-registration?code=INVITATION_CODE`.

Users must first visit `/registration` to enter their invitation code, which will then direct them to either the new or legacy registration flow based on their selection. 