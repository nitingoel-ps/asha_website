import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Card, InputGroup, Form, Button } from "react-bootstrap";
import "./ChatTab.css";
import { useMemo } from "react";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// Move processStreamingText to a more generic name since it handles both streaming and complete text
const processThinkTags = (text) => {
  const segments = [];
  let currentIndex = 0;
  let inThinkBlock = false;
  let thinkContent = '';

  while (currentIndex < text.length) {
    const thinkStart = text.indexOf('<think>', currentIndex);
    const thinkEnd = text.indexOf('</think>', currentIndex);

    if (inThinkBlock) {
      if (thinkEnd === -1) {
        thinkContent += text.slice(currentIndex);
        break;
      } else {
        thinkContent += text.slice(currentIndex, thinkEnd);
        segments.push(`<span class="think-content">${thinkContent}</span>`);
        currentIndex = thinkEnd + 8;
        inThinkBlock = false;
        thinkContent = '';
      }
    } else {
      if (thinkStart === -1) {
        segments.push(text.slice(currentIndex));
        break;
      } else {
        if (thinkStart > currentIndex) {
          segments.push(text.slice(currentIndex, thinkStart));
        }
        inThinkBlock = true;
        currentIndex = thinkStart + 7;
      }
    }
  }

  return segments.join('');
};

// Update MessageContent component
const MessageContent = ({ message, renderers }) => {
  if (message.isThinkBlock) {
    return <div className="think-content">{message.text}</div>;
  }
  
  if (message.model?.output_type === "text") {
    return <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message.text}</pre>;
  }
  
  return <ReactMarkdown components={renderers}>{message.text}</ReactMarkdown>;
};

function ChatTab({ 
  suggestedQuestions, 
  chatMessages, 
  setChatMessages, 
  isThinking, 
  setIsThinking,
  openInNewWindow = false // true for new window, false for new tab
}) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [hasUserStartedChat, setHasUserStartedChat] = useState(false);
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
  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetchWithAuth("/ai/models/");
        if (response.ok) {
          const data = await response.json();
          // Sort models by name before setting state
          const sortedModels = data.models.sort((a, b) => 
            a.name.localeCompare(b.name)
          );
          setModels(sortedModels);
          setSelectedModel(sortedModels[0]); // Select first model by default
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
      }
    };
    fetchModels();
  }, []);

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
    if (!message.trim() || !selectedModel) return;

    // Set flag when user sends their first message
    if (!hasUserStartedChat) {
      setHasUserStartedChat(true);
    }

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

    const response = await fetchWithAuth("/new-chat/", {
        method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: formattedMessages,
        model: {
          provider: selectedModel.provider,
          model_id: selectedModel.id
        }
      }), // Send formatted history
      });

    if (!response.ok) {
      throw new Error("Failed to fetch AI response.");
    }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let currentBuffer = "";
      let inThinkBlock = false;

      const updateMessages = (newContent, isThink = false) => {
        setChatMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          const isLastMessageMatchingType = lastMessage?.isThinkBlock === isThink;
          
          if (lastMessage?.isStreaming && isLastMessageMatchingType) {
            // Update existing streaming message
            return [
              ...prevMessages.slice(0, -1),
              {
                type: "ai",
                text: lastMessage.text + newContent,
                isStreaming: true,
                isThinkBlock: isThink,
                model: selectedModel
              }
            ];
          } else {
            // Create new message
            return [
              ...prevMessages,
              {
                type: "ai",
                text: newContent,
                isStreaming: true,
                isThinkBlock: isThink,
                model: selectedModel
              }
            ];
          }
        });
      };

      // Process the response stream
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        currentBuffer += chunk;

        while (currentBuffer.length > 0) {
          if (inThinkBlock) {
            const endIndex = currentBuffer.indexOf('</think>');
            if (endIndex === -1) {
              // Think block continues - update with current buffer
              updateMessages(currentBuffer, true);
              currentBuffer = '';
            } else {
              // Think block ends
              const thinkContent = currentBuffer.slice(0, endIndex);
              if (thinkContent.length > 0) {
                updateMessages(thinkContent, true);
              }
              currentBuffer = currentBuffer.slice(endIndex + 8); // 8 is length of </think>
              inThinkBlock = false;
            }
          } else {
            const startIndex = currentBuffer.indexOf('<think>');
            if (startIndex === -1) {
              // No think block - regular content
              updateMessages(currentBuffer);
              currentBuffer = '';
            } else {
              // Found start of think block
              if (startIndex > 0) {
                // Process content before think block
                updateMessages(currentBuffer.slice(0, startIndex));
              }
              currentBuffer = currentBuffer.slice(startIndex + 7); // 7 is length of <think>
              inThinkBlock = true;
            }
          }
        }
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

  // Only show suggested questions when no chat messages exist
  const showSuggestedQuestions = chatMessages.length === 0;

  return (
    <>
      <Card className="chat-interface mb-4">
        <Card.Body>
          {/* Suggested Questions - Only show before user starts chatting */}
          {!hasUserStartedChat && (
            <div className="suggested-questions mb-3">
              <h6>Suggested Questions:</h6>
              {suggestedQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline-primary"
                  className="me-2 mb-2 small-text"
                  onClick={() => handleSendMessage(question)}
                  disabled={isThinking}
                >
                  {question}
                </Button>
              ))}
            </div>
          )}

          {/* Chat Messages - Full height when suggestions are hidden */}
          <div className={`chat-messages ${hasUserStartedChat ? 'chat-messages-full' : ''}`} ref={chatContainerRef}>
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`chat-message ${
                  message.type === "user" ? "text-end" : "text-start"
                }`}
                ref={message.type === "user" ? lastUserMessageRef : null}
              >
                <MessageContent message={message} renderers={renderers} />
              </div>
            ))}
            {isThinking && (
              <div className="chat-message text-start ai-message">
                <span className="blinking-cursor">AI is thinking...</span>
              </div>
            )}
          </div>

          {/* Chat Input and Model Selector */}
          <div className="chat-footer">
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
            
            <div className="model-selector-inline">
              <Form.Select
                size="sm"
                value={selectedModel?.id || ''}
                onChange={(e) => setSelectedModel(models.find(m => m.id === e.target.value))}
                disabled={isThinking}
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </Form.Select>
            </div>
          </div>
        </Card.Body>
      </Card>
    </>
  );
}

export default ChatTab;