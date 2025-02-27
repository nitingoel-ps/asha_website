import React from 'react';
import ReactMarkdown from 'react-markdown';
import 'katex/dist/katex.min.css';

function MessageList({ messages = [] }) {
  if (!Array.isArray(messages)) {
    console.warn('MessageList: messages prop is not an array:', messages);
    return null;
  }

  return (
    <div className="ai-chat-message-list">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`ai-chat-message ${message.role === 'user' ? 'ai-chat-user-message' : 'ai-chat-ai-message'}`}
        >
          <div className="ai-chat-message-content">
            {message.role === 'user' ? (
              <p>{message.content}</p>
            ) : (
              <ReactMarkdown>
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MessageList;
