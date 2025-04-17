import React, { useState, useMemo } from 'react';
import { ListGroup, Button, Spinner, Form } from 'react-bootstrap';
// Replace FA icons with FI (Feather Icons) which have thinner lines
import { FiTrash2, FiEdit, FiPlus, FiCheck, FiX, FiPlusCircle, FiEdit2 } from 'react-icons/fi';

function ChatList({ sessions = [], selectedSession, onSelectSession, onDeleteSession, onRenameSession, loading, onNewChat }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  // Group sessions by time periods
  const groupedSessions = useMemo(() => {
    // Get current date
    const now = new Date();
    
    // Calculate date thresholds
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    // Group sessions
    const groups = {
      today: { title: 'Today', sessions: [] },
      recent: { title: 'Previous 7 Days', sessions: [] },
      older: { title: 'Previous 30 Days', sessions: [] },
      oldest: { title: 'Older', sessions: [] }
    };
    
    // Sort sessions by update date (newest first)
    const sortedSessions = [...sessions].sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at) : (a.created_at ? new Date(a.created_at) : new Date(0));
      const dateB = b.updated_at ? new Date(b.updated_at) : (b.created_at ? new Date(b.created_at) : new Date(0));
      return dateB - dateA;
    });
    
    // Distribute sessions into groups
    sortedSessions.forEach(session => {
      const sessionDate = session.updated_at 
        ? new Date(session.updated_at) 
        : (session.created_at ? new Date(session.created_at) : new Date());
      
      if (sessionDate >= startOfToday) {
        groups.today.sessions.push(session);
      } else if (sessionDate >= sevenDaysAgo) {
        groups.recent.sessions.push(session);
      } else if (sessionDate >= thirtyDaysAgo) {
        groups.older.sessions.push(session);
      } else {
        groups.oldest.sessions.push(session);
      }
    });
    
    return groups;
  }, [sessions]);

  const handleEditClick = (e, session) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditName(session.session_name || 'New Chat');
  };

  const handleSaveEdit = async (e, sessionId) => {
    e.stopPropagation();
    await onRenameSession(sessionId, editName);
    setEditingId(null);
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="text-center p-3">
        <Spinner animation="border" />
      </div>
    );
  }

  // Render a session group
  const renderSessionGroup = (group, title) => {
    if (group.sessions.length === 0) return null;
    
    const isToday = title === 'Today';
    
    return (
      <div key={title}>
        <div className={`chat-session-group-header ${isToday ? 'today' : ''}`}>{title}</div>
        <ListGroup variant="flush">
          {group.sessions.map((session) => (
            <ListGroup.Item
              key={session.id}
              active={selectedSession?.id === session.id}
              className="d-flex justify-content-between align-items-center ai-chat-session-item"
              onClick={() => onSelectSession(session)}
            >
              {editingId === session.id ? (
                <Form.Control
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(e, session.id);
                    if (e.key === 'Escape') handleCancelEdit(e);
                  }}
                  size="sm"
                  className="me-2"
                  autoFocus
                />
              ) : (
                <span className="text-truncate">{session.session_name || 'New Chat'}</span>
              )}
              <div className="d-flex align-items-center">
                {editingId === session.id ? (
                  <>
                    <Button
                      variant="link"
                      className="edit-button p-1"
                      onClick={(e) => handleSaveEdit(e, session.id)}
                    >
                      <FiCheck />
                    </Button>
                    <Button
                      variant="link"
                      className="edit-button p-1"
                      onClick={handleCancelEdit}
                    >
                      <FiX />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="link"
                    className="edit-button p-1"
                    onClick={(e) => handleEditClick(e, session)}
                  >
                    <FiEdit2 size={14} />
                  </Button>
                )}
                <Button
                  variant="link"
                  className="delete-button p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                >
                  <FiTrash2 size={14} />
                </Button>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </div>
    );
  };

  return (
    <>
      <div className="chat-sidebar-header">
        <h6>Chat History</h6>
        {onNewChat && (
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={onNewChat}
            className="new-chat-small"
            title="Start a new chat"
          >
            <FiPlus />
          </Button>
        )}
      </div>
      
      {renderSessionGroup(groupedSessions.today, 'Today')}
      {renderSessionGroup(groupedSessions.recent, 'Previous 7 Days')}
      {renderSessionGroup(groupedSessions.older, 'Previous 30 Days')}
      {renderSessionGroup(groupedSessions.oldest, 'Older')}
      
      {sessions.length === 0 && (
        <div className="chat-empty-state">
          No chat sessions yet. Start a new conversation!
        </div>
      )}
    </>
  );
}

export default ChatList;
