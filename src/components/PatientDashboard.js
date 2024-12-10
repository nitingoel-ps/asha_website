import React, { useEffect, useState, useRef } from "react";
import { Tabs, Tab, Card, Container, Spinner, Button, Form, InputGroup } from "react-bootstrap";
import { IoSend } from "react-icons/io5";

import ConditionsTab from "./PatientDashboard/ConditionsTab";
import ChartsTab from "./PatientDashboard/ChartsTab";
import ProceduresTab from "./PatientDashboard/ProceduresTab";
import MedicationsTab from "./PatientDashboard/MedicationsTab";
import DiagnosticReportsTab from "./PatientDashboard/DiagnosticReportsTab";
import axiosInstance from "../utils/axiosInstance";
import { Activity, Pill, FileText, Clipboard, Microscope } from "lucide-react";
import "./PatientDashboard/ChatTab.css";
import { useNavigate } from "react-router-dom"; // Import useNavigate

function PatientDashboard() {
  const [patientData, setPatientData] = useState(null); // To store API response
  const [loading, setLoading] = useState(true); // To track loading state
  const [error, setError] = useState(null); // To track errors
  const navigate = useNavigate();

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isThinking, setIsThinking] = useState(false); // Track AI thinking status
  const chatContainerRef = useRef(null); // Create a ref for the chat container
  
  // Check authentication
  useEffect(() => {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        navigate('/'); // Redirect to home if not logged in
      }
  }, [navigate]);


  // Fetch patient data on component mount
  useEffect(() => {
    axiosInstance
      .get("/patient-dashboard")
      .then((response) => {
        setPatientData(response.data);
        setChatMessages([
          {
            type: "ai",
            text: response.data.overall_summary, // Set AI's summary as the initial message
          },
        ]);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to fetch patient data.");
        setLoading(false);

      });
  }, []);

  // Suggested questions
  const suggestedQuestions = patientData?.suggested_questions?.research_topics || [];
  // Scroll to the bottom whenever chatMessages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);
  
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

    // Placeholder API call to get the AI's response
    try {
      const response = await axiosInstance.post("/chat/", { question: message });
      const aiResponse = response.data.response;

      // Add AI's response to the chat
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { type: "ai", text: aiResponse },
      ]);
    } catch (error) {
      console.error("Failed to get AI response:", error);
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { type: "ai", text: "I'm sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsThinking(false); // Clear thinking status
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error) {
    return (
      /*
      <Container className="mt-5 text-center">
        <h5 className="text-danger">{error}</h5>
      </Container>
      */
      <Container className="mt-5 text-center">
      <Card>
        <Card.Body>
          <h3 className="text-primary">We're building your dashboard!</h3>
          <p>
            Your dashboard is currently under construction. Once we finish processing your uploaded files or fetching data from your medical providers, your personalized dashboard will be ready.
          </p>
          <p>
            In the meantime, you can <a href="/upload-files">upload your medical records directly</a> or <a href="/add-providers">connect your healthcare providers</a>.
          </p>
        </Card.Body>
      </Card>
    </Container>     
    );
  }

  return (
    <div className="dashboard-container">
      <Card className="mb-4">
        <Card.Header>
          <div className="flex items-center justify-between">
            <Card.Title>Patient Dashboard</Card.Title>
            <Card.Subtitle className="mb-2 text-muted">
              Welcome back, {patientData.demographics.name}
            </Card.Subtitle>
          </div>
        </Card.Header>
        <Card.Body>
          <Tabs defaultActiveKey="summary" id="patient-dashboard-tabs" className="mt-4">
            {/* Updated Summary Tab */}
            <Tab eventKey="summary" title={<><Activity size={16} /> Chat</>}>

            
              {/* Chat Interface */}
              <Card className="chat-interface mb-4">
                <Card.Body>
                  <div
                    className="chat-messages"
                    ref={chatContainerRef} // Attach the ref to the chat-messages div
                  >
                    {chatMessages.map((message, index) => (
                        <div
                        key={index}
                        className={`chat-message ${
                            message.type === "user" ? "text-end" : "text-start"
                        }`}
                        >
                        {message.text}
                        </div>
                    ))}
                    {isThinking && (
                      <div className="chat-message text-start ai-message">
                        <span className="blinking-cursor">AI is thinking... </span>
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
                        onKeyDown={(e) =>
                        e.key === "Enter" && handleSendMessage(currentMessage)
                        }
                        disabled={isThinking} // Disable input when AI is thinking
                    />
                    </InputGroup>
                </Card.Body>
            </Card>

              {/* Suggested Questions */}
              <div className="suggested-questions mb-4">
                <h5>Suggested Questions:</h5>
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline-primary"
                    className="me-2 mb-2"
                    onClick={() => handleSendMessage(question)}
                    disabled={isThinking} // Disable buttons when AI is thinking
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </Tab>

            {/* Other Tabs */}
            <Tab eventKey="charts" title={<><Clipboard size={16} /> Charts</>}>
              <ChartsTab charts={patientData.important_charts}/>
            </Tab>
            <Tab eventKey="conditions" title={<><Clipboard size={16} /> Conditions</>}>
              <ConditionsTab conditions={patientData.conditions} />
            </Tab>
            <Tab eventKey="procedures" title={<><FileText size={16} /> Procedures</>}>
              <ProceduresTab procedures={patientData.procedures} />
            </Tab>
            <Tab eventKey="medications" title={<><Pill size={16} /> Medications</>}>
              <MedicationsTab medications={patientData.medication_requsts} />
            </Tab>
            <Tab eventKey="diagnostic-reports" title={<><Microscope size={16} /> Diagnostic Reports</>}>
              <DiagnosticReportsTab diagnosticReports={patientData.diagnostic_reports} />
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </div>
  );
}

export default PatientDashboard;