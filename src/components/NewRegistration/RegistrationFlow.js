import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Card, Alert } from 'react-bootstrap';
import axiosInstance from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { loadContent } from './termsService';

// Import step components
import EmailPasswordStep from './EmailPasswordStep';
import VerificationStep from './VerificationStep';
import ProfileInfoStep from './ProfileInfoStep';
import ReviewStep from './ReviewStep';
import SuccessStep from './SuccessStep';
import TermsAndPrivacyModal from './TermsAndPrivacyModal';

// Import styles
import './RegistrationFlow.css';

function RegistrationFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, login } = useAuth();
  
  // State for the multi-step form
  const [currentStep, setCurrentStep] = useState(1);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsContent, setTermsContent] = useState('');
  const [termsType, setTermsType] = useState('terms'); // 'terms' or 'privacy'
  const [registrationComplete, setRegistrationComplete] = useState(false);
  
  // State for form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    verificationCode: '',
    invitationCode: '',
    agreedToTerms: false,
  });
  
  // State for session token from verification process
  const [sessionToken, setSessionToken] = useState('');
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isCodeValid, setIsCodeValid] = useState(false);
  
  // Check for invitation code in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    
    if (!code) {
      navigate('/registration');
      return;
    }
    
    setFormData(prev => ({ ...prev, invitationCode: code }));
    validateInvitationCode(code);
  }, [location]);
  
  // Validate invitation code
  const validateInvitationCode = (code) => {
    setIsLoading(true);
    axiosInstance
      .post('/validate/registration-code/', { code })
      .then(() => {
        setIsCodeValid(true);
        setError('');
      })
      .catch((error) => {
        setIsCodeValid(false);
        setError('Invalid invitation code. Redirecting to registration page...');
        setTimeout(() => navigate('/registration'), 3000);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (registrationComplete) return 100;
    return (currentStep / 4) * 100;
  };
  
  // Handle form data changes
  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Navigate to next step
  const handleNextStep = () => {
    if (currentStep < 4) {
      // Clear verification code when moving to next step
      if (currentStep === 1) {
        setFormData(prev => ({ ...prev, verificationCode: '' }));
      }
      setCurrentStep(prevStep => prevStep + 1);
      window.scrollTo(0, 0);
    }
  };
  
  // Navigate to previous step
  const handlePrevStep = () => {
    if (currentStep > 1) {
      // Clear verification code when going back to email step
      if (currentStep === 2) {
        setFormData(prev => ({ ...prev, verificationCode: '' }));
      }
      setCurrentStep(prevStep => prevStep - 1);
      window.scrollTo(0, 0);
    }
  };
  
  // Handle opening Terms or Privacy Policy
  const handleOpenTerms = async (type) => {
    setIsLoading(true);
    setTermsType(type);
    
    try {
      const content = await loadContent(type);
      setTermsContent(content);
      setShowTermsModal(true);
    } catch (err) {
      console.error('Error loading terms content:', err);
      setError('Failed to load document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle submission of step 1
  const handleEmailSubmit = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Call API to check email and send verification code
      const response = await axiosInstance.post('/auth/check-email/', {
        email: formData.email
      });
      
      if (response.data.session_token) {
        setSessionToken(response.data.session_token);
        handleNextStep();
      } else {
        setError(response.data.message || 'Failed to process your request.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle verification code submission
  const handleVerifyCode = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await axiosInstance.post('/auth/verify-email-code/', {
        session_token: sessionToken,
        code: formData.verificationCode
      });
      
      if (response.data.email) {
        handleNextStep();
      } else {
        setError(response.data.error || 'Invalid verification code.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle complete registration
  const handleCompleteRegistration = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');
    
    try {
      const response = await axiosInstance.post('/auth/register/', {
        username: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
        password2: formData.confirmPassword,
        date_of_birth: formData.dateOfBirth,
        session_token: sessionToken,
        code: formData.verificationCode,
        invitation_code: formData.invitationCode
      });
      
      // Check for successful response - either by success field or message content or status 201
      const isSuccess = 
        response.data.success || 
        (response.data.message && response.data.message.includes('success')) ||
        response.status === 201;
      
      if (isSuccess) {
        // Show the success step instead of redirecting
        setRegistrationComplete(true);
        window.scrollTo(0, 0);
      } else {
        setError(response.data.message || response.data.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'An error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render appropriate step based on currentStep
  const renderStep = () => {
    if (!isCodeValid) {
      return (
        <Alert variant="warning">
          Validating invitation code... {error && <div>{error}</div>}
        </Alert>
      );
    }
    
    // Show success page if registration is complete
    if (registrationComplete) {
      return <SuccessStep email={formData.email} />;
    }
    
    switch (currentStep) {
      case 1:
        return (
          <EmailPasswordStep 
            formData={formData}
            handleChange={handleChange}
            handleNextStep={handleEmailSubmit}
            handleOpenTerms={handleOpenTerms}
            isLoading={isLoading}
          />
        );
      case 2:
        return (
          <VerificationStep
            email={formData.email}
            verificationCode={formData.verificationCode}
            handleChange={(value) => handleChange('verificationCode', value)}
            handlePrevStep={handlePrevStep}
            handleNextStep={handleVerifyCode}
            isLoading={isLoading}
          />
        );
      case 3:
        return (
          <ProfileInfoStep
            firstName={formData.firstName}
            lastName={formData.lastName}
            dateOfBirth={formData.dateOfBirth}
            handleChange={handleChange}
            handlePrevStep={handlePrevStep}
            handleNextStep={handleNextStep}
            isLoading={isLoading}
          />
        );
      case 4:
        return (
          <ReviewStep
            formData={formData}
            handlePrevStep={handlePrevStep}
            handleSubmit={handleCompleteRegistration}
            handleOpenTerms={handleOpenTerms}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <Container className="registration-flow-container mt-5">
      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      
      <Card className="registration-card">
        <Card.Body>
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
            <div className="progress-steps">
              <div className={currentStep >= 1 ? 'step active' : (registrationComplete ? 'step active' : 'step')}>Email</div>
              <div className={currentStep >= 2 ? 'step active' : (registrationComplete ? 'step active' : 'step')}>Verify</div>
              <div className={currentStep >= 3 ? 'step active' : (registrationComplete ? 'step active' : 'step')}>Profile</div>
              <div className={currentStep >= 4 ? 'step active' : (registrationComplete ? 'step active' : 'step')}>Review</div>
            </div>
          </div>
          
          {renderStep()}
        </Card.Body>
      </Card>
      
      <TermsAndPrivacyModal
        show={showTermsModal}
        onHide={() => setShowTermsModal(false)}
        content={termsContent}
        title={termsType === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
      />
    </Container>
  );
}

export default RegistrationFlow; 