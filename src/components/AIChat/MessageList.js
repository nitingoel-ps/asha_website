import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
// Use dynamic imports with error handling for optional dependencies
let SyntaxHighlighter, a11yDark, remarkGfm;

try {
  // Try to load these dependencies, but don't fail if they're missing
  const syntaxImport = require('react-syntax-highlighter');
  SyntaxHighlighter = syntaxImport.Prism;
  a11yDark = require('react-syntax-highlighter/dist/esm/styles/prism').a11yDark;
  remarkGfm = require('remark-gfm').default;
} catch (e) {
  console.warn('Some markdown rendering dependencies are missing. Code blocks and tables may not render correctly.');
}

// Optional KaTeX import - wrap in try/catch
try {
  require('katex/dist/katex.min.css');
} catch (e) {
  console.warn('KaTeX styles not loaded. Math equations may not render correctly.');
}

const Message = ({ role, content, isStreaming }) => {
  console.log(`Rendering message - role: ${role}, streaming: ${isStreaming}, content length: ${content?.length}, content: "${content?.substring(0, 30)}${content?.length > 30 ? '...' : ''}"`);
  
  return (
    <div className={`ai-chat-message ai-chat-${role}-message`}>
      <div className={`ai-chat-message-content ${isStreaming ? 'is-streaming' : ''}`}>
        <ReactMarkdown
          children={content || ''}
          remarkPlugins={remarkGfm ? [remarkGfm] : []}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match && SyntaxHighlighter ? (
                <SyntaxHighlighter
                  style={a11yDark}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        />
      </div>
    </div>
  );
};

const MessageList = ({ messages }) => {
  useEffect(() => {
    console.log('MessageList rendered with messages:', messages);
    
    if (messages.length === 0) {
      console.log('Warning: MessageList received empty messages array');
    }
    
    // Log each message in a clearer format
    messages.forEach((msg, i) => {
      console.log(`Message ${i}: ${msg.role} - ${msg.content?.substring(0, 30)}${msg.content?.length > 30 ? '...' : ''}`);
    });
  }, [messages]);

  return (
    <div className="ai-chat-message-list">
      {messages.map((message, index) => (
        <Message
          key={index}
          role={message.role}
          content={message.content}
          isStreaming={message.isStreaming}
        />
      ))}
    </div>
  );
};

export default MessageList;
