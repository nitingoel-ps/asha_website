import React from 'react';
import ReactMarkdown from 'react-markdown';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

function MessageList({ messages = [] }) {
  const processText = (text, references) => {
    if (typeof text !== 'string') return text;

    const parts = text.split(/(\[[^\]]+\])/);
    return parts.map((part, index) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const content = part.slice(1, -1);
        if (/^\d+$/.test(content) || content.startsWith('Ref:')) {
          return (
            <span key={index} className="reference">[{content}]</span>
          );
        }
        // Handle math content
        return (
          <BlockMath key={index}>
            {content}
          </BlockMath>
        );
      }
      return part;
    });
  };

  // Updated custom renderers for ReactMarkdown
  const renderers = {
    p: ({ children }) => {
      // Only wrap in p tag if not inside a list item
      const processedChildren = React.Children.map(children, child => {
        return processText(child);
      });
      return <p>{processedChildren}</p>;
    },
    a: ({ children, href }) => (
      <a 
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          window.open(href, '_blank');
        }}
      >
        {children}
      </a>
    ),
  };

  if (!Array.isArray(messages)) {
    console.warn('MessageList: messages prop is not an array:', messages);
    return null;
  }

  return (
    <div className="message-list">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`message ${message.role === 'user' ? 'user-message' : 'ai-message'}`}
        >
          <div className="message-content">
            {message.role === 'user' ? (
              <p>{message.content}</p>
            ) : (
              <ReactMarkdown components={renderers}>
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
