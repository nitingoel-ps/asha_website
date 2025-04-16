import React, { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, Container, Row, Col, Alert, Tabs, Tab, Button } from 'react-bootstrap';
import { 
  FlaskConical, 
  MessageSquareMore, 
  MessageCircle,
  Activity, 
  Pill, 
  CalendarCheck, 
  Search, 
  Heart,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import './HealthPriorities.css';
import EvidenceWithReferences from './EvidenceWithReferences';
import axiosInstance from '../../utils/axiosInstance';
// Import the utility function
import { formatDisplayText } from '../../utils/textUtils';

const ActionIcon = ({ actionType }) => {
  switch (actionType.toLowerCase()) {
    case 'test':
      return <FlaskConical className="action-icon" />;
    case 'discussion':
      return <MessageCircle className="action-icon" />;
    case 'monitor':
      return <Activity className="action-icon" />;
    case 'medication':
      return <Pill className="action-icon" />;
    case 'followup':
      return <CalendarCheck className="action-icon" />;
    case 'research':
      return <Search className="action-icon" />;
    case 'lifestyle':
      return <Heart className="action-icon" />;
    default:
      return null;
  }
};

const PriorityBadge = ({ priority }) => {
  const getBadgeColor = () => {
    switch (priority) {
      case 1: return 'danger';
      case 2: return 'warning';
      case 3:
      case 4:
      case 5:
        return 'info';
      default: return 'secondary';
    }
  };

  return (
    <Badge bg={getBadgeColor()}>{getPriorityText(priority)}</Badge>
  );
};

const getPriorityText = (priority) => {
  switch (priority) {
    case 1: return 'High';
    case 2: return 'Medium';
    case 3:
    case 4:
    case 5:
      return 'Low';
    default: return 'Unknown';
  }
};

const StatusBadge = ({ status }) => {
  const getBadgeVariant = (status) => {
    switch (status.toLowerCase()) {
      case 'active': return 'success';
      case 'suggested': return 'warning';
      case 'completed': return 'secondary';
      case 'dismissed': return 'danger';
      default: return 'info';
    }
  };

  return (
    <Badge bg={getBadgeVariant(status)}>{status}</Badge>
  );
};

// Modified EvidenceSection to display references from separate field
const EvidenceSection = ({ title, content, references }) => {
  console.log(`EvidenceSection - title: ${title}, content:`, content, "references:", references);
  
  // Skip rendering if no content
  if (!content || content.trim() === '') {
    console.log(`EvidenceSection - Empty content for ${title}, returning null`);
    return null;
  }
  
  // Parse references if they exist
  let parsedReferences = [];
  if (references) {
    try {
      // References might be stored as a JSON string
      if (typeof references === 'string') {
        parsedReferences = JSON.parse(references);
      } else if (Array.isArray(references)) {
        parsedReferences = references;
      }
    } catch (error) {
      console.error("Error parsing references:", error);
    }
  }
  
  console.log("Parsed references:", parsedReferences);
  
  return (
    <div className="mt-3">
      <div className="evidence-title">{title}</div>
      <div className="evidence-text">
        {content}
      </div>
      {parsedReferences && parsedReferences.length > 0 && (
        <div className="evidence-references mt-2">
          <small className="text-muted">
            References: {parsedReferences.map((reference, refIndex) => (
              <span key={refIndex}>
                {refIndex > 0 && ", "}
                <EvidenceWithReferences text={reference} />
              </span>
            ))}
          </small>
        </div>
      )}
    </div>
  );
};

function HealthPriorityDetail() {
  const { priorityId } = useParams();
  const navigate = useNavigate();
  const [showEvidence, setShowEvidence] = useState(false);
  const [activeActionTab, setActiveActionTab] = useState('suggested');
  const [focusArea, setFocusArea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch the specific health priority data
  useEffect(() => {
    const fetchFocusArea = async () => {
      try {
        const response = await axiosInstance.get('/patient-dashboard/');
        const allFocusAreas = response.data?.focus_areas || [];
        const foundFocusArea = allFocusAreas.find(area => area.id.toString() === priorityId);
        
        if (foundFocusArea) {
          setFocusArea(foundFocusArea);
        } else {
          setError('Health priority not found.');
        }
        setLoading(false);
      } catch (err) {
        setError('Failed to load health priority. Please try again later.');
        console.error('Error fetching health priority:', err);
        setLoading(false);
      }
    };

    fetchFocusArea();
  }, [priorityId]);

  // Add effect to scroll to top when the component mounts or priorityId changes
  useEffect(() => {
    window.scrollTo(0, 0);
    // Reset evidence visibility when navigating to a new priority
    setShowEvidence(false);
  }, [priorityId]);

  // Group actions by status
  const groupedActions = useMemo(() => {
    if (!focusArea || !focusArea.actions) return { suggested: [], active: [], completed: [] };
    
    // Sort within each group by priority (lower numbers first)
    const sortByPriority = (a, b) => a.priority - b.priority;
    
    return {
      suggested: focusArea.actions
        .filter(action => action.status.toLowerCase() === 'suggested')
        .sort(sortByPriority),
      
      active: focusArea.actions
        .filter(action => action.status.toLowerCase() === 'active')
        .sort(sortByPriority),
      
      completed: focusArea.actions
        .filter(action => ['completed', 'dismissed'].includes(action.status.toLowerCase()))
        .sort(sortByPriority)
    };
  }, [focusArea]);

  // Set initial active tab based on available actions
  useEffect(() => {
    if (groupedActions.suggested.length > 0) {
      setActiveActionTab('suggested');
    } else if (groupedActions.active.length > 0) {
      setActiveActionTab('active');
    } else if (groupedActions.completed.length > 0) {
      setActiveActionTab('completed');
    }
  }, [groupedActions]);

  // Add debugging for evidence
  useEffect(() => {
    if (focusArea && focusArea.evidence) {
      console.log("Focus Area Evidence:", focusArea.evidence);
    }
  }, [focusArea]);

  // Check if there's any evidence to show with debug
  const hasEvidence = useMemo(() => {
    if (!focusArea || !focusArea.evidence) {
      console.log("No evidence data available");
      return false;
    }
    
    const evidenceFields = [
      'medications_narrative',
      'lab_findings_narrative',
      'medical_reports_narrative',
      'vitals_narrative',
      'visits_narrative',
      'procedures_narrative'
    ];
    
    const hasAnyEvidence = evidenceFields.some(field => 
      focusArea.evidence[field] && focusArea.evidence[field].trim() !== ''
    );
    
    console.log("Has evidence:", hasAnyEvidence);
    if (hasAnyEvidence) {
      evidenceFields.forEach(field => {
        console.log(`${field}:`, focusArea.evidence[field]);
      });
    }
    
    return hasAnyEvidence;
  }, [focusArea]);

  const toggleEvidence = () => {
    setShowEvidence(prev => !prev);
  };

  // Prepare the evidence sections with both narrative and references
  const evidenceSections = useMemo(() => {
    if (!focusArea || !focusArea.evidence) return [];
    
    return [
      { 
        title: "Medications", 
        content: focusArea.evidence?.medications_narrative || "", 
        references: focusArea.evidence?.medications_references
      },
      { 
        title: "Lab Findings", 
        content: focusArea.evidence?.lab_findings_narrative || "", 
        references: focusArea.evidence?.lab_findings_references
      },
      { 
        title: "Medical Reports", 
        content: focusArea.evidence?.medical_reports_narrative || "", 
        references: focusArea.evidence?.medical_reports_references
      },
      { 
        title: "Vital Signs", 
        content: focusArea.evidence?.vitals_narrative || "", 
        references: focusArea.evidence?.vitals_references
      },
      { 
        title: "Visits", 
        content: focusArea.evidence?.visits_narrative || "", 
        references: focusArea.evidence?.visits_references
      },
      { 
        title: "Procedures", 
        content: focusArea.evidence?.procedures_narrative || "", 
        references: focusArea.evidence?.procedures_references
      }
    ];
  }, [focusArea]);
  
  // Extra debug logging for evidence sections
  useEffect(() => {
    if (showEvidence && focusArea && focusArea.evidence) {
      console.log("Evidence sections being rendered:", 
        evidenceSections.filter(section => section.content && section.content.trim() !== '')
      );
    }
  }, [showEvidence, focusArea, evidenceSections]);

  if (loading) {
    return (
      <Container className="health-priority-detail">
        <div className="loading-insights">
          <div className="loading-spinner"></div>
          <p>Loading health priority details...</p>
        </div>
      </Container>
    );
  }

  if (error || !focusArea) {
    return (
      <Container className="health-priority-detail mt-4">
        <Alert variant="warning">
          {error || 'Health priority not found.'}
        </Alert>
        <Button 
          variant="outline-primary" 
          className="mt-3"
          onClick={() => navigate('/health-priorities')}
        >
          Back to Health Priorities
        </Button>
      </Container>
    );
  }

  const getBadgeVariant = (status) => {
    switch (status.toLowerCase()) {
      case 'active': return 'success';
      case 'suggested': return 'warning';
      case 'completed': return 'secondary';
      case 'dismissed': return 'danger';
      default: return 'info';
    }
  };

  // Function to get the display name for action types
  const getActionTypeDisplayName = (actionType) => {
    if (!actionType) return 'Other';
    
    const actionTypeMap = {
      'test': 'Lab or other Test',
      'lifestyle': 'Lifestyle Change',
      'discussion': 'Discussion Topic with provider',
      'monitor': 'Ongoing Monitoring',
      'followup': 'Follow Up',
      'research': 'Research Topic',
      'medication': 'Medication',
      'other': 'Other'
    };
    
    return actionTypeMap[actionType.toLowerCase()] || actionType;
  };

  // New ActionItemCard component that includes status badge and action buttons in bottom right
  const ActionItemCard = ({ action }) => {
    const navigate = useNavigate();

    const handleChatClick = (e) => {
      e.stopPropagation(); // Prevent triggering parent card click events
      
      // Create an initial message with context from both the focus area and the action
      const initialMessage = `I want understand and learn more about a recommended action item suggested to me by AI for a specific health focus area.
      
Focus area title: "${focusArea.title}"
Action item title: "${action.title}"
Action item description: ${action.description}`;
      
      console.log('Chat button clicked with message:', initialMessage);
      
      // Navigate to AI chat with the message as state
      navigate('/ai-chat', { 
        state: { 
          initialMessage 
        }
      });
      
      console.log('Navigated to AI chat with initialMessage in state');
    };

    const handleAcceptClick = (e) => {
      e.stopPropagation();
      console.log('Accept button clicked for action:', action.id);
      // Add implementation for accepting an action
    };

    const handleRejectClick = (e) => {
      e.stopPropagation();
      console.log('Reject button clicked for action:', action.id);
      // Add implementation for rejecting an action
    };

    // Format the instructions text to remove square brackets
    const formattedInstructions = formatDisplayText(action.instructions);

    return (
      <Card className="mb-3 action-item-card">
        <Card.Body>
          <div className="d-flex">
            <div className="action-icon-container">
              <ActionIcon actionType={action.action_type} />
            </div>
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h5 className="mb-0">{action.title}</h5>
                <Badge bg={getBadgeVariant(action.status)}>{action.status}</Badge>
              </div>
              <p>{action.description}</p>
              
              {/* Display instructions if available - now using formatted text */}
              {formattedInstructions && formattedInstructions.trim() !== '' && (
                <div className="action-instructions">
                  <h6 className="instructions-title">Instructions:</h6>
                  <p className="instructions-content">{formattedInstructions}</p>
                </div>
              )}
              
              {/* Completely restructured action buttons container */}
              <div className="action-footer">
                {/* Type information - aligned left */}
                <div className="action-type-container">
                  <span className="action-buttons-label">Type:</span>
                  <span className="action-type-value">
                    {getActionTypeDisplayName(action.action_type)}
                  </span>
                </div>
                
                {/* Actions - aligned right */}
                <div className="action-buttons-container">
                  <span className="action-buttons-label">Actions:</span>
                  <div className="action-buttons">
                    <Button 
                      variant="link"
                      size="sm"
                      className="action-button"
                      onClick={handleChatClick}
                      title="Discuss this with AI assistant"
                    >
                      <MessageSquareMore size={20} />
                    </Button>
                    <Button 
                      variant="link"
                      size="sm"
                      className="action-button"
                      onClick={handleAcceptClick}
                      title="Accept this action item"
                    >
                      <ThumbsUp size={20} />
                    </Button>
                    <Button 
                      variant="link"
                      size="sm"
                      className="action-button"
                      onClick={handleRejectClick}
                      title="Reject this action item"
                    >
                      <ThumbsDown size={20} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  };

  return (
    <Container className="health-priority-detail pb-4">
      <div className="mb-3">
        <Button 
          variant="outline-primary" 
          onClick={() => navigate('/health-priorities')}
          className="mb-3"
        >
          Back to Health Priorities
        </Button>
      </div>
      
      <Card className="mb-4 priority-detail-card">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <Card.Title as="h3">{focusArea.title}</Card.Title>
            <StatusBadge status={focusArea.status} />
          </div>
          
          <Card.Text>
            {focusArea.description || focusArea.short_description}
          </Card.Text>
          
          {hasEvidence && (
            <div className="mt-3">
              <div 
                className="evidence-toggle" 
                onClick={toggleEvidence}
                role="button"
                aria-expanded={showEvidence}
              >
                <span>
                  {showEvidence ? (
                    <ChevronUp size={16} className="toggle-icon" />
                  ) : (
                    <ChevronDown size={16} className="toggle-icon" />
                  )}
                  Why is this suggested?
                </span>
              </div>
              
              {showEvidence && (
                <div className="mt-3 evidence-container">
                  <h5>From your records:</h5>
                  
                  {evidenceSections.filter(section => section.content && section.content.trim() !== '').map((section, index) => (
                    <EvidenceSection 
                      key={index}
                      title={section.title} 
                      content={section.content}
                      references={section.references}
                    />
                  ))}
                  
                  {evidenceSections.filter(section => section.content && section.content.trim() !== '').length === 0 && (
                    <p className="text-muted">No specific evidence records available.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
      
      {/* Restructured Action Items section */}
      <section className="action-items-section">
        {/* This header will be sticky */}
        <header className="action-items-header">
          <div className="d-flex align-items-center justify-content-between">
            <h4 className="m-0 action-header-title">Action Items</h4>
            
            {focusArea.actions && focusArea.actions.length > 0 && (
              <Tabs
                activeKey={activeActionTab}
                onSelect={(key) => setActiveActionTab(key)}
                className="action-items-inline-tabs health-priority-tabs mb-0"
              >
                <Tab 
                  eventKey="suggested" 
                  title={`Review (${groupedActions.suggested.length})`}
                />
                <Tab 
                  eventKey="active" 
                  title={`Active (${groupedActions.active.length})`}
                />
                <Tab 
                  eventKey="inactive" 
                  title={`Completed (${groupedActions.completed.length})`}
                />
              </Tabs>
            )}
          </div>
        </header>

        {/* Content area for action items */}
        <div className="action-items-content pt-2">
          {focusArea.actions && focusArea.actions.length > 0 ? (
            <>
              {activeActionTab === 'suggested' && (
                <div className="action-items-list">
                  {groupedActions.suggested.map((action) => (
                    <ActionItemCard key={action.id} action={action} />
                  ))}
                  {groupedActions.suggested.length === 0 && (
                    <Alert variant="light" className="text-center mt-3">
                      No actions to review
                    </Alert>
                  )}
                </div>
              )}
              
              {activeActionTab === 'active' && (
                <div className="action-items-list">
                  {groupedActions.active.map((action) => (
                    <ActionItemCard key={action.id} action={action} />
                  ))}
                  {groupedActions.active.length === 0 && (
                    <Alert variant="light" className="text-center mt-3">
                      No active actions
                    </Alert>
                  )}
                </div>
              )}
              
              {activeActionTab === 'completed' && (
                <div className="action-items-list">
                  {groupedActions.completed.map((action) => (
                    <ActionItemCard key={action.id} action={action} />
                  ))}
                  {groupedActions.completed.length === 0 && (
                    <Alert variant="light" className="text-center mt-3">
                      No completed actions
                    </Alert>
                  )}
                </div>
              )}
            </>
          ) : (
            <Alert variant="info">
              No action items have been identified for this health priority.
            </Alert>
          )}
        </div>
      </section>
    </Container>
  );
}

export default HealthPriorityDetail; 