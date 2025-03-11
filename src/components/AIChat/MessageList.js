import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { isActivityMessage, extractActivityText, parseContentWithActivities, processReferenceLinks } from './MessageUtils';
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

// Activity indicator component for <<...>> segments with active/completed status
const ActivityIndicator = ({ text, isActive }) => {
  return (
    <span className={`ai-chat-activity-indicator ${isActive ? 'active' : 'completed'}`}>
      {isActive && <span className="ai-chat-activity-indicator-pulse"></span>}
      <span>{text}</span>
      {!isActive && <span className="ai-chat-activity-indicator-check">✓</span>}
    </span>
  );
};

// Component to parse and render content with embedded activity indicators
const ContentParser = ({ content, isStreaming }) => {
  const [activityStates, setActivityStates] = useState({});
  const prevContentRef = useRef('');
  const segments = parseContentWithActivities(content);
  
  useEffect(() => {
    if (!content) return;
    
    // If not streaming, mark all activity indicators as completed
    if (!isStreaming) {
      const completedActivities = {};
      const regex = /<<([^>]*)>>/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const fullMatch = match[0];
        completedActivities[fullMatch] = false;
      }
      setActivityStates(completedActivities);
      prevContentRef.current = content;
      return;
    }
    
    // For streaming messages, mark new indicators as active
    const currentActivities = {};
    const regex2 = /<<([^>]*)>>/g;
    let m;
    while ((m = regex2.exec(content)) !== null) {
      const fullMatch = m[0];
      currentActivities[fullMatch] = true;
    }
    
    if (isStreaming && content !== prevContentRef.current) {
      const hasNewNonActivityContent = 
        content.length > prevContentRef.current.length && 
        !content.endsWith('>>') && 
        content.substring(prevContentRef.current.length).trim() !== '';
      
      if (hasNewNonActivityContent) {
        setActivityStates(prev => {
          const updated = { ...prev };
          Object.keys(prev).forEach(key => {
            if (prev[key] === true) {
              updated[key] = false; // mark as completed
            }
          });
          return updated;
        });
      }
    }
    
    setActivityStates(prev => {
      const updated = { ...prev };
      Object.keys(currentActivities).forEach(key => {
        if (updated[key] === undefined) {
          updated[key] = true; // new activity starts as active
        }
      });
      return updated;
    });
    
    prevContentRef.current = content;
  }, [content, isStreaming]);
  
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'activity') {
          const fullMarker = `<<${segment.content}>>`;
          const isActive = activityStates[fullMarker] !== false; // Consider active unless explicitly marked as false
          
          return <ActivityIndicator 
            key={index} 
            text={segment.content} 
            isActive={isActive} 
          />;
        } else {
          return <ReactMarkdown 
            key={index}
            children={processReferenceLinks(segment.content || '')}
            remarkPlugins={remarkGfm ? [remarkGfm] : []}
            rehypePlugins={[rehypeRaw]}
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
          />;
        }
      })}
    </>
  );
};

const Message = ({ role, content, isStreaming }) => {
  console.log(`Rendering message - role: ${role}, streaming: ${isStreaming}, content length: ${content?.length}, content: "${content?.substring(0, 30)}${content?.length > 30 ? '...' : ''}"`);
  
  return (
    <div className={`ai-chat-message ai-chat-${role}-message`}>
      <div className={`ai-chat-message-content ${isStreaming ? 'is-streaming' : ''}`}>
        <ContentParser content={content} isStreaming={isStreaming} />
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
