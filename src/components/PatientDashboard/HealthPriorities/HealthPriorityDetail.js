import React, { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, Container, Row, Col, Alert, Button } from 'react-bootstrap';
import { 
  FlaskConical, 
  MessageCircle, 
  Activity, 
  Pill, 
  CalendarCheck, 
  Search, 
  Heart,
  ArrowLeft,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import './HealthPriorities.css';

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

const ActionItem = ({ action }) => {
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
              <PriorityBadge priority={action.priority} />
            </div>
            <p>{action.description}</p>
            {action.due_date && (
              <small className="text-muted">
                Due by: {new Date(action.due_date).toLocaleDateString()}
              </small>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

const EvidenceSection = ({ evidence, title, isArray = false }) => {
  if (!evidence || (isArray && evidence.length === 0) || (!isArray && !evidence.trim())) {
    return null;
  }

  return (
    <div className="mb-3">
      <h6 className="evidence-title">{title}</h6>
      {isArray ? (
        <ul className="evidence-list">
          {evidence.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="evidence-text">{evidence}</p>
      )}
    </div>
  );
};

const HealthPriorityDetail = ({ focusAreas = [] }) => {
  const { priorityId } = useParams();
  const navigate = useNavigate();
  const [showEvidence, setShowEvidence] = useState(false);
  
  const focusArea = useMemo(() => {
    return focusAreas.find(area => area.id.toString() === priorityId) || null;
  }, [focusAreas, priorityId]);

  // Add effect to scroll to top when the component mounts or priorityId changes
  useEffect(() => {
    window.scrollTo(0, 0);
    // Reset evidence visibility when navigating to a new priority
    setShowEvidence(false);
  }, [priorityId]);

  const handleBack = () => {
    navigate('/patient-dashboard/health-priorities');
  };

  // Check if there's any evidence to show
  const hasEvidence = useMemo(() => {
    if (!focusArea || !focusArea.evidence) return false;
    
    const evidenceFields = [
      'medications_narrative',
      'lab_findings_narrative',
      'medical_reports_narrative',
      'vitals_narrative',
      'visits_narrative',
      'procedures_narrative'
    ];
    
    return evidenceFields.some(field => 
      focusArea.evidence[field] && focusArea.evidence[field].trim() !== ''
    );
  }, [focusArea]);

  const toggleEvidence = () => {
    setShowEvidence(prev => !prev);
  };

  if (!focusArea) {
    return (
      <Container className="mt-4">
        <Button variant="outline-primary" className="mb-3" onClick={handleBack}>
          <ArrowLeft size={16} /> Back to Health Priorities
        </Button>
        <Alert variant="warning">
          Health priority not found.
        </Alert>
      </Container>
    );
  }

  // Sort actions by priority (lower numbers are higher priority)
  const sortedActions = [...(focusArea.actions || [])].sort((a, b) => 
    a.priority - b.priority
  );

  // Prepare the evidence sections
  const evidenceSections = [
    { title: "Medications", content: focusArea.evidence?.medications_narrative || "", isArray: false },
    { title: "Lab Findings", content: focusArea.evidence?.lab_findings_narrative || "", isArray: false },
    { title: "Medical Reports", content: focusArea.evidence?.medical_reports_narrative || "", isArray: false },
    { title: "Vital Signs", content: focusArea.evidence?.vitals_narrative || "", isArray: false },
    { title: "Visits", content: focusArea.evidence?.visits_narrative || "", isArray: false },
    { title: "Procedures", content: focusArea.evidence?.procedures_narrative || "", isArray: false },
  ];

  return (
    <Container className="health-priority-detail pb-4">
      <Button variant="outline-primary" className="mb-4" onClick={handleBack}>
        <ArrowLeft size={16} /> Back to Health Priorities
      </Button>
      
      <Card className="mb-4 priority-detail-card">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <Card.Title as="h3">{focusArea.title}</Card.Title>
            <StatusBadge status={focusArea.status} />
          </div>
          
          <Card.Text>
            {focusArea.description || focusArea.short_description}
          </Card.Text>
          
          <div className="mb-3">
            <strong>Importance Score:</strong> {focusArea.importance_score}/10
          </div>
          
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
                  {evidenceSections.map((section, index) => 
                    section.content && (
                      <EvidenceSection 
                        key={index}
                        title={section.title} 
                        evidence={section.content}
                        isArray={section.isArray} 
                      />
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
      
      <h4 className="mb-3">Action Items</h4>
      {sortedActions.length === 0 ? (
        <Alert variant="info">
          No action items have been identified for this health priority.
        </Alert>
      ) : (
        <Row>
          <Col>
            {sortedActions.map((action) => (
              <ActionItem key={action.id} action={action} />
            ))}
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default HealthPriorityDetail;
