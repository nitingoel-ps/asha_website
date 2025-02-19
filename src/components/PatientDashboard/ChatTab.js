import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Card, InputGroup, Form, Button } from "react-bootstrap";
import "./ChatTab.css";
import { useMemo } from "react";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// Add these new persona-related constants
const PERSONAS = [
  {
    id: 'record_keeper',
    name: 'Search Your Records',
    icon: '🏥',
    description: '',
    welcomeMessage: "Hi! Can I help you find something in your records?",
    suggestedQuestions: [
      "Who was the last doctor I visited and when?",
      "What were the results of my last lab test"
    ],
    preferred_model: "gpt-4o"
  },
  /*
  {
    id: 'note_taker',
    name: 'Debby (the Nurse)',
    icon: '👩‍⚕️',
    description: 'I can help document your symptoms and provide basic health guidance.',
    welcomeMessage: "Hi, I am Debby, are you experiencing any symptoms that I can note down for the doctor?",
    suggestedQuestions: [],
    preferred_model: "gpt-4o"
  },*/
  {
    id: 'researcher',
    name: 'Search the internet',
    icon: '🌐',
    description: '',
    welcomeMessage: "Hi!. Are there any specific topics you would like me to research on the internet for you? I will use both the internet resources and your own health data to get meaningful results.",
    suggestedQuestions: [
      "What are best practices for reducing cholesterol",
      "How can I reduce my blood glucose"
    ],
    preferred_model: "sonar-pro"    
  }
];

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
const processText = (text, references) => {
  // Check if text is a string, if not return as is
  if (typeof text !== 'string') {
    return text;
  }

  const parts = text.split(/(\[[^\]]+\])/);
  return parts.map((part, index) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      const content = part.slice(1, -1);
      
      // Handle numeric citations [n]
      if (/^\d+$/.test(content)) {
        // Check if this citation has a corresponding reference
        const hasReference = references && references[content];
        return (
          <a 
            key={index}
            href={hasReference ? `#ref-${content}` : '#'}
            className="citation"
            onClick={(e) => {
              e.preventDefault();
              if (hasReference) {
                const refElement = document.getElementById(`ref-${content}`);
                refElement?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            [{content}]
          </a>
        );
      }
      
      // Handle medical record references [Ref: path]
      if (content.startsWith('Ref:')) {
        const path = content.split('Ref:')[1].trim();
        const displayText = path.split('/').pop(); // Extract the name/id portion
        return (
          <a
            key={index}
            href={path}
            className="citation"
            onClick={(e) => {
              e.preventDefault();
              window.open(path, '_blank');
            }}
          >
            <sup>[{path}]</sup>
          </a>
        );
      }
    }
    return part;
  });
};

const ReferencesSection = ({ references }) => {
  if (!references || Object.keys(references).length === 0) return null;

  // Separate references into external and internal
  const externalRefs = {};
  const internalRefs = {};

  Object.entries(references).forEach(([key, value]) => {
    if (key.startsWith('Ref:')) {
      internalRefs[key] = value;
    } else {
      externalRefs[key] = value;
    }
  });

  return (
    <div className="references-section">
      {Object.keys(externalRefs).length > 0 && (
        <>
          <h4>References</h4>
          {Object.entries(externalRefs).map(([key, url]) => (
            <div key={key} className="reference-item" id={`ref-${key}`}>
              <span className="reference-number">[{key}]</span>
              <a 
                href={url}
                className="reference-link"
              >
                {url}
              </a>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

// Update MessageContent component
const MessageContent = ({ message, renderers }) => {
  if (message.isThinkBlock) {
    return <div className="think-content">{message.text}</div>;
  }

  if (message.model?.output_type === "text") {
    return <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message.text}</pre>;
  }

  // Split the message text into content and references, keeping all reference lines
  const parts = message.text.split(/\n(?=\[(?:\d+|Ref:).*?]:)/);
  const content = parts[0];
  const referencesText = parts.slice(1).join('\n');
  let references = {};

  // Parse all reference lines
  if (referencesText) {
    const refLines = referencesText.split('\n');
    refLines.forEach(line => {
      const match = line.match(/\[(.*?)\]:\s*(.*)/);
      if (match) {
        const [_, key, value] = match;
        references[key] = value.trim();
      }
    });
  }

  // Create custom renderers that include references
  const customRenderers = {
    ...renderers,
    p: ({ children }) => {
      const processedChildren = React.Children.map(children, child => {
        return processText(child, references);
      });
      return <p>{processedChildren}</p>;
    }
  };

  return (
    <>
      <ReactMarkdown components={customRenderers}>
        {content}
      </ReactMarkdown>
      <ReferencesSection references={references} />
    </>
  );
};

function ChatTab({ 
  suggestedQuestions, 
  chatMessages, 
  setChatMessages, 
  isThinking, 
  setIsThinking,
  selectedPersona, // Add selectedPersona as a prop
  setSelectedPersona, // Add setSelectedPersona as a prop
  openInNewWindow = false // true for new window, false for new tab
}) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [hasUserStartedChat, setHasUserStartedChat] = useState(false);
  const chatContainerRef = useRef(null);
  const lastUserMessageRef = useRef(null);
  const hasScrolledRef = useRef(false); // To ensure scroll happens only once per message

  // Custom renderers for ReactMarkdown
  // This object defines how different markdown elements should be rendered
  const renderers = {
    // Ordered lists (<ol>) - Apply custom styling class
    ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,

    // Unordered lists (<ul>) - Apply custom styling class
    ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,

    // List items (<li>) - Apply custom styling class
    li: ({ children }) => <li className="markdown-li">{children}</li>,

    // Paragraphs (<p>)
    p: ({ children }) => {
      // Handle array of children or single child
      const processedChildren = React.Children.map(children, child => {
        return processText(child);
      });
      return <p>{processedChildren}</p>;
    },

    // Links (<a>)
    a: ({ children, href }) => (
      <a 
        href={href}
        // Always open in new tab/window based on openInNewWindow prop
        target={openInNewWindow ? "_blank" : "_blank"}
        // Security best practice for external links
        rel="noopener noreferrer"
        onClick={(e) => {
          // Prevent default link behavior
          e.preventDefault();
          // Custom window opening behavior
          window.open(href, '_blank', openInNewWindow ? 'noopener,noreferrer' : '');
        }}
      >
        {children}
      </a>
    ),
  };
  
  // Add useEffect hook to handle component mount and unmount
  useEffect(() => {
    console.log("ChatTab mounted");
    return () => {
      console.log("ChatTab unmounted");
    };
  }, []);

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

  // Initialize chat with welcome message when persona changes
  useEffect(() => {
    if (!hasUserStartedChat && selectedPersona) {
      setChatMessages((prevMessages) => {
        // Check if the welcome message is already present to avoid re-render loop
        if (prevMessages.length === 0 || prevMessages[0].text !== selectedPersona.welcomeMessage) {
          return [
            { 
              type: "ai", 
              text: selectedPersona.welcomeMessage,
              model: selectedModel 
            }
          ];
        }
        return prevMessages;
      });
    }
  }, [selectedPersona, hasUserStartedChat, setChatMessages, selectedModel]);

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
    if (!message.trim() || !selectedModel || !selectedPersona) return;

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
        },
        persona_id: selectedPersona.id // Add persona ID to request
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

  // Add this function to process text with math expressions and references
  const processText = (text) => {
    const parts = text.split(/(\[.*?\])/);
    console.log('Split parts:', parts);
    return parts.map((part, index) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const content = part.slice(1, -1);
        console.log('Found bracketed content:', content);
        
        // Log reference check
        const isNumericRef = /^\d+$/.test(content);
        const isTextRef = content.startsWith('Ref:');
        console.log('Reference checks:', {
          content,
          isNumericRef,
          isTextRef,
          'is reference?': isNumericRef || isTextRef
        });

        if (isNumericRef || isTextRef) {
          console.log('Treating as reference:', content);
          return <span key={index} className="reference">[{content}]</span>;
        }
        
        console.log('Treating as math:', content);
        return (
          <BlockMath key={index}>
            {content}
          </BlockMath>
        );
      }
      return part;
    });
  };

  // Add persona selector component
  const handlePersonaChange = (personaId) => {
    const newPersona = PERSONAS.find(p => p.id === personaId);
    setSelectedPersona(newPersona);
    setHasUserStartedChat(false);
    setChatMessages([]); // Clear chat history
    
    // Set the preferred model if it exists
    if (newPersona?.preferred_model) {
      const preferredModel = models.find(m => m.id === newPersona.preferred_model);
      if (preferredModel) {
        setSelectedModel(preferredModel);
      }
    }
  };

  // Add new useEffect to set initial model based on selected persona
  useEffect(() => {
    if (selectedPersona?.preferred_model && models.length > 0) {
      const preferredModel = models.find(m => m.id === selectedPersona.preferred_model);
      if (preferredModel) {
        setSelectedModel(preferredModel);
      }
    }
  }, [selectedPersona, models]);

  const PersonaSelector = () => (
    <div className="persona-selector mb-3">
      <div className="d-flex align-items-center gap-3">
        <label className="persona-label mb-0">Choose: </label>
        <div className="d-flex align-items-center flex-grow-1 gap-3">
          <Form.Select
            value={selectedPersona?.id || ''}
            onChange={(e) => handlePersonaChange(e.target.value)}
            className="persona-select"
          >
            <option value="">Use Case ...</option>
            {PERSONAS.map(persona => (
              <option key={persona.id} value={persona.id}>
                {persona.icon} {persona.name}
              </option>
            ))}
          </Form.Select>
          {selectedPersona && (
            <p className="persona-description text-muted mb-0 flex-grow-1">
              {selectedPersona.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // Only show suggested questions when no chat messages exist
  const showSuggestedQuestions = chatMessages.length === 0;

  return (
    <>
      <Card className="chat-interface mb-4">
        <Card.Body>
          {/* Add PersonaSelector before chat area */}
          <PersonaSelector />
          
          {/* Only show chat area if persona is selected */}
          {selectedPersona && (
            <>
              {/* Suggested Questions - Only show before user starts chatting */}
              {!hasUserStartedChat && (
                <div className="suggested-questions mb-3">
                  <h6>Suggested Questions:</h6>
                  {selectedPersona.suggestedQuestions.map((question, index) => (
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
            </>
          )}
        </Card.Body>
      </Card>
    </>
  );
}

export default ChatTab;