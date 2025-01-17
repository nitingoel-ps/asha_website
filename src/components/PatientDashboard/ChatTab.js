import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Card, InputGroup, Form, Button } from "react-bootstrap";
import "./ChatTab.css";
import { useMemo } from "react";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

function ChatTab({ 
  suggestedQuestions, 
  chatMessages, 
  setChatMessages, 
  isThinking, 
  setIsThinking,
  openInNewWindow = false // true for new window, false for new tab
}) {
  const [currentMessage, setCurrentMessage] = useState("");
  const chatContainerRef = useRef(null);
  const lastUserMessageRef = useRef(null);
  const hasScrolledRef = useRef(false); // To ensure scroll happens only once per message
  const renderers = {
    ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
    ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
    li: ({ children }) => <li className="markdown-li">{children}</li>,
    p: ({ children }) => {
      if (typeof children === 'string') {
        return <p>{processText(children)}</p>;
      }
      return <p>{children}</p>;
    },
    a: ({ children, href }) => (
      <a 
        href={href}
        target={openInNewWindow ? "_blank" : "_blank"}
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          window.open(href, '_blank', openInNewWindow ? 'noopener,noreferrer' : '');
        }}
      >
        {children}
      </a>
    ),
  };
  /*

const renderers = useMemo(
    () => ({
      listItem: ({ children }) => <li>{children}</li>,
    }),
    []
  );
*/
  // Scroll handling during AI response
  useEffect(() => {
    let scrollInterval;

    if (chatContainerRef.current && isThinking) {
      const chatContainer = chatContainerRef.current;
      const initialScrollTop = chatContainer.scrollTop; // Track where scrolling starts

      scrollInterval = setInterval(() => {
        if (!chatContainer || !isThinking) {
          clearInterval(scrollInterval); // Stop scrolling when AI response ends
          return;
        }

        // Calculate how far we have scrolled
        const scrolledDistance = chatContainer.scrollTop - initialScrollTop;
  
        // Stop scrolling after a threshold (e.g., 200px)
        if (scrolledDistance >= 200) {
          clearInterval(scrollInterval);
          return;
        }

        // Continue scrolling slightly (adjust 20 for smoothness)
        chatContainer.scrollBy({
          top: 20, // Adjust scrolling increment here
          behavior: "smooth",
        });
      }, 100); // Adjust interval timing for smoother or faster scrolling
    }

    return () => clearInterval(scrollInterval); // Cleanup interval on unmount or when effect re-runs
  }, [isThinking]);

  // Handle sending a message
  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    // Add user's message to the chat
    setChatMessages((prevMessages) => [
      ...prevMessages,
      { type: "user", text: message },
    ]);

    setCurrentMessage(""); // Clear the input field
    setIsThinking(true); // Set thinking status
    hasScrolledRef.current = false; // Reset scrolling flag

    try {
    // Transform chatMessages into OpenAI's messages format
    const formattedMessages = [
      ...chatMessages.map((msg) => ({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.text,
      })),
      { role: "user", content: message }, // Include the new user question
    ];

    const response = await fetchWithAuth("/chat/", {
        method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: formattedMessages }), // Send formatted history
      });

    if (!response.ok) {
      throw new Error("Failed to fetch AI response.");
    }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let chunkedMessage = "";

    // Process the response stream
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        chunkedMessage += chunk;

        // Update the AI response incrementally
        setChatMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];
        // Check if the last message is AI's incomplete response
          if (lastMessage?.type === "ai" && lastMessage?.isStreaming) {
          // Update the last message
            return [
              ...prevMessages.slice(0, -1),
              { type: "ai", text: chunkedMessage, isStreaming: true },
            ];
          } else {
          // Add a new AI message
            return [...prevMessages, { type: "ai", text: chunkedMessage, isStreaming: true }];
          }
        });
      }

    // Mark the AI response as complete
      setChatMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        if (lastMessage?.type === "ai" && lastMessage?.isStreaming) {
          return [
            ...prevMessages.slice(0, -1),
            { ...lastMessage, isStreaming: false },
          ];
        }
        return prevMessages;
      });
    } catch (error) {
      console.error("Failed to get AI response:", error);

    // Display error in the chat
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { type: "ai", text: "I'm sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsThinking(false); // Clear thinking status
    }
  };

  // Add this function to process text with math expressions
  const processText = (text) => {
    const parts = text.split(/(\[.*?\])/);
    return parts.map((part, index) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        // Extract the math expression without the brackets
        const mathExpression = part.slice(1, -1);
        return (
          <BlockMath key={index}>
            {mathExpression}
          </BlockMath>
        );
      }
      return part;
    });
  };

  return (
    <>
      <Card className="chat-interface mb-4">
        <Card.Body>
          <div className="chat-messages" ref={chatContainerRef}>
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`chat-message ${
                  message.type === "user" ? "text-end" : "text-start"
                }`}
                ref={message.type === "user" ? lastUserMessageRef : null}
              >
                <ReactMarkdown components={renderers}>
                  {message.text}
                </ReactMarkdown>
              </div>
            ))}
            {isThinking && (
              <div className="chat-message text-start ai-message">
                <span className="blinking-cursor">AI is thinking...</span>
              </div>
            )}
          </div>

        {/* Chat Input */}
          <InputGroup className="chat-input-container">
            <Form.Control
              as="textarea"
              rows={1}
              className="chat-input"
              placeholder="Type your message..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage(currentMessage)}
              disabled={isThinking}
            />
          </InputGroup>
        </Card.Body>
      </Card>

              {/* Suggested Questions */}
      <div className="suggested-questions mb-4">
        <h6>Suggested Questions:</h6>
        {suggestedQuestions.map((question, index) => (
          <Button
            key={index}
            variant="outline-primary"
            className="me-2 mb-2 small-text"
            onClick={() => handleSendMessage(question)}
                    disabled={isThinking} // Disable buttons when AI is thinking
          >
            {question}
          </Button>
        ))}
      </div>
    </>
  );
}

export default ChatTab;