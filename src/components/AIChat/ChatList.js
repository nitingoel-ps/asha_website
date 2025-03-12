import React, { useState } from 'react';
import { ListGroup, Button, Spinner, Form } from 'react-bootstrap';
// Replace FA icons with FI (Feather Icons) which have thinner lines
import { FiTrash2, FiEdit, FiPlus, FiCheck, FiX, FiPlusCircle, FiEdit2 } from 'react-icons/fi';

function ChatList({ sessions = [], selectedSession, onSelectSession, onDeleteSession, onRenameSession, loading, onNewChat }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

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

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-2 p-2">
        <h6 className="mb-0">Chat History</h6>
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
      
      <ListGroup>
        {sessions.map((session) => (
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
                  <FiEdit2 />
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
                <FiTrash2 />
              </Button>
            </div>
          </ListGroup.Item>
        ))}
        {sessions.length === 0 && (
          <ListGroup.Item className="text-center text-muted">
            No chat sessions yet
          </ListGroup.Item>
        )}
      </ListGroup>
    </>
  );
}

export default ChatList;
