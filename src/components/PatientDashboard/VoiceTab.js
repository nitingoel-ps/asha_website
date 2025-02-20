import React, { useState, useRef } from 'react';
import { Button, Card, Spinner } from 'react-bootstrap';
import { Mic, Square, Send, X, Play, Pause } from 'lucide-react';
import './VoiceTab.css';
import { fetchWithAuth } from "../../utils/fetchWithAuth";

const VoiceTab = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(new Audio());
  
  const startRecording = async () => {
    try {
      setError(null);
      // First check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current.src = audioUrl;
        setHasRecording(true);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission was denied. Please allow microphone access and try again.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No microphone found. Please make sure your device has a working microphone.');
      } else {
        setError(`Unable to access microphone: ${err.message}`);
      }
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setHasRecording(false);
    audioRef.current.src = '';
  };

  const sendRecording = async () => {
    if (!hasRecording) return;

    setIsProcessing(true);
    const reader = new FileReader();
    const audioBlob = await fetch(audioRef.current.src).then(r => r.blob());

    reader.onload = async () => {
      const base64Audio = reader.result.split(',')[1];
      try {
        const response = await fetchWithAuth('/voice-chat/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio })
        });

        const data = await response.json();
        setResponse(data);
        
        // Convert base64 response to audio
        const responseAudio = `data:audio/wav;base64,${data.audio}`;
        audioRef.current.src = responseAudio;
        
        setHasRecording(false);
        setIsProcessing(false);
      } catch (error) {
        console.error('Error sending audio:', error);
        setIsProcessing(false);
      }
    };

    reader.readAsDataURL(audioBlob);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Set up audio event listeners
  React.useEffect(() => {
    const audio = audioRef.current;
    audio.onended = () => setIsPlaying(false);
    return () => {
      audio.onended = null;
    };
  }, []);

  return (
    <Card className="voice-chat-interface">
      <Card.Body>
        <div className="voice-controls">
          {error && (
            <div className="error-message alert alert-danger">
              {error}
              <Button 
                variant="outline-danger" 
                size="sm" 
                className="ms-2"
                onClick={() => setError(null)}
              >
                <X size={16} />
              </Button>
            </div>
          )}

          {!isRecording && !hasRecording && (
            <Button 
              variant="primary" 
              className="record-button"
              onClick={startRecording}
            >
              <Mic /> Start Recording
            </Button>
          )}

          {isRecording && (
            <div className="recording-controls">
              <Button 
                variant="danger" 
                className="stop-button"
                onClick={stopRecording}
              >
                <Square /> Stop Recording
              </Button>
              <div className="recording-indicator">
                Recording... <span className="pulse"></span>
              </div>
            </div>
          )}

          {hasRecording && (
            <div className="recording-actions">
              <Button 
                variant="secondary" 
                onClick={togglePlayback}
              >
                {isPlaying ? <Pause /> : <Play />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button 
                variant="danger" 
                onClick={cancelRecording}
              >
                <X /> Cancel
              </Button>
              <Button 
                variant="success" 
                onClick={sendRecording}
                disabled={isProcessing}
              >
                <Send /> Send
              </Button>
            </div>
          )}

          {isProcessing && (
            <div className="processing-indicator">
              <Spinner animation="border" size="sm" />
              Processing...
            </div>
          )}

          {response && (
            <div className="response-section">
              <div className="response-text">
                {response.text}
              </div>
              <Button 
                variant="light" 
                onClick={togglePlayback}
                className="play-response"
              >
                {isPlaying ? <Pause /> : <Play />}
                {isPlaying ? 'Pause Response' : 'Play Response'}
              </Button>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default VoiceTab;
