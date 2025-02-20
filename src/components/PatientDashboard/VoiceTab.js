import React, { useState, useRef } from 'react';
import { Button, Card, Spinner, Form } from 'react-bootstrap';  // Add Form import
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
  const [audioUrl, setAudioUrl] = useState(null);
  const [isInstantSend, setIsInstantSend] = useState(() => {
    // Initialize from localStorage, default to true if not set
    const saved = localStorage.getItem('voiceInstantSend');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(new Audio());

  // Add debug logging for audio events
  const setupAudioHandlers = (audio) => {
    audio.onloadeddata = () => console.log('Audio loaded:', audio.src.slice(0, 50) + '...');
    audio.onerror = (e) => console.error('Audio error:', e);
    audio.onplay = () => console.log('Audio started playing');
    audio.onpause = () => console.log('Audio paused');
    audio.onended = () => {
      console.log('Audio playback ended');
      setIsPlaying(false);
    };
    // Add canplaythrough event handler
    audio.oncanplaythrough = () => {
      console.log('Audio can play through without buffering');
    };
    // Add error handler specifically for autoplay failures
    audio.onplayerror = (error) => {
      console.error('Autoplay error:', error);
      setError('Could not auto-play response. Please tap play.');
    };
  };

  // Update useEffect to use new audio handlers
  React.useEffect(() => {
    const audio = audioRef.current;
    setupAudioHandlers(audio);
    return () => {
      audio.onloadeddata = null;
      audio.onerror = null;
      audio.onplay = null;
      audio.onpause = null;
      audio.onended = null;
      audio.oncanplaythrough = null;
    };
  }, []);

  // Save preference when it changes
  React.useEffect(() => {
    localStorage.setItem('voiceInstantSend', JSON.stringify(isInstantSend));
  }, [isInstantSend]);

  const convertBlobToBase64 = (blob) => {
    console.log('Converting blob to base64, blob size:', blob.size);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('Blob converted to base64, length:', reader.result.length);
        resolve(reader.result);
      };
      reader.onerror = (error) => {
        console.error('Error converting blob to base64:', error);
        reject(error);
      };
      reader.readAsDataURL(blob);
    });
  };

  const createAudioElement = async (base64Audio) => {
    console.log('Creating new audio element...');
    return new Promise((resolve, reject) => {
      const newAudio = new Audio();
      
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Audio loading timeout'));
      }, 10000); // Increased timeout to 10 seconds

      const cleanup = () => {
        newAudio.oncanplaythrough = null;
        newAudio.onerror = null;
        clearTimeout(timeoutId);
      };

      newAudio.oncanplaythrough = () => {
        cleanup();
        resolve(newAudio);
      };

      newAudio.onerror = (error) => {
        cleanup();
        reject(new Error(`Audio loading failed: ${error.message}`));
      };

      // For iOS compatibility, we need to set these attributes
      newAudio.setAttribute('playsinline', 'true');
      newAudio.setAttribute('webkit-playsinline', 'true');
      
      // Load the audio
      newAudio.src = base64Audio;
      
      // For iOS, we might need to load() explicitly
      try {
        newAudio.load();
      } catch (e) {
        console.warn('Audio load() failed, continuing anyway:', e);
      }
    });
  };

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/aac',
      ''  // empty string means let browser pick format
    ];
    
    for (const type of types) {
      if (type === '' || MediaRecorder.isTypeSupported(type)) {
        console.log('Using MIME type:', type || 'browser default');
        return type;
      }
    }
    
    throw new Error('No supported audio MIME type found');
  };

  const startRecording = async () => {
    try {
      setError(null);
      // First check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get supported MIME type
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      
      console.log('Creating MediaRecorder with options:', options);
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log('Recording stopped, processing audio chunks...');
        try {
          const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log('Created audio blob:', { 
            size: audioBlob.size, 
            type: audioBlob.type,
            chunks: audioChunksRef.current.length 
          });

          if (isInstantSend) {
            // Convert and send immediately
            const base64Audio = await convertBlobToBase64(audioBlob);
            const base64Data = base64Audio.split(',')[1];
            
            const response = await fetchWithAuth('/voice-chat/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64Data })
            });

            const data = await response.json();
            setResponse(data);
            
            // Handle the response audio
            const responseAudio = `data:audio/wav;base64,${data.audio}`;
            const newAudio = new Audio(responseAudio);
            setupAudioHandlers(newAudio);
            audioRef.current = newAudio;

            // Attempt autoplay
            try {
              await newAudio.play();
              setIsPlaying(true);
            } catch (error) {
              console.error('Autoplay failed:', error);
              if (error.name === 'NotAllowedError') {
                setError('Please tap play to hear the response');
              }
            }
            
            setIsProcessing(false);
          } else {
            // Original behavior for review before send
            const blobUrl = URL.createObjectURL(audioBlob);
            setAudioUrl(blobUrl);
            audioRef.current = new Audio(blobUrl);
            setupAudioHandlers(audioRef.current);
            audioRef.current.blob = audioBlob;
            setHasRecording(true);
          }
          
          console.log('Audio processing completed');
        } catch (error) {
          console.error('Error processing audio:', error);
          setError('Error processing audio: ' + error.message);
          setIsProcessing(false);
        }
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
      
      if (isInstantSend) {
        // We'll handle the actual sending in the onstop handler
        setIsProcessing(true);
      }
    }
  };

  // Update cancelRecording to properly clean up
  const cancelRecording = () => {
    console.log('Canceling recording...');
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      // Clean up blob URL if it exists
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    }
    setIsRecording(false);
    setHasRecording(false);
    setAudioUrl(null);
    setIsPlaying(false);
    console.log('Recording canceled and cleaned up');
  };

  const sendRecording = async () => {
    if (!hasRecording || !audioRef.current.blob) return;

    setIsProcessing(true);
    try {
      // Convert blob to base64 only when sending to API
      const base64Audio = await convertBlobToBase64(audioRef.current.blob);
      const base64Data = base64Audio.split(',')[1];
      
      const response = await fetchWithAuth('/voice-chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Data })
      });

      const data = await response.json();
      setResponse(data);
      
      // Handle the response audio
      const responseAudio = `data:audio/wav;base64,${data.audio}`;
      const newAudio = new Audio(responseAudio);
      setupAudioHandlers(newAudio);
      audioRef.current = newAudio;

      // Attempt to autoplay
      try {
        const playPromise = newAudio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Response autoplay started successfully');
              setIsPlaying(true);
            })
            .catch(error => {
              console.error('Autoplay failed:', error);
              // On iOS, we need explicit user interaction
              if (error.name === 'NotAllowedError') {
                setError('Please tap play to hear the response');
              }
              setIsPlaying(false);
            });
        }
      } catch (error) {
        console.error('Error during autoplay setup:', error);
      }
      
      setHasRecording(false);
      setIsProcessing(false);
    } catch (error) {
      console.error('Error sending audio:', error);
      setIsProcessing(false);
      setError('Error sending audio: ' + error.message);
    }
  };

  // Clean up blob URLs when component unmounts
  React.useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const togglePlayback = () => {
    console.log('Toggle playback called, current playing state:', isPlaying);
    
    if (!audioRef.current.src) {
      console.error('No audio source available');
      setError('No audio available for playback');
      return;
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // For iOS, we need to catch and handle the play() promise
        const playAttempt = audioRef.current.play();
        
        if (playAttempt !== undefined) {
          playAttempt
            .then(() => {
              console.log('Audio playback started successfully');
              setIsPlaying(true);
            })
            .catch(error => {
              console.error('Playback error:', error);
              // On iOS, we might need to retry with user interaction
              if (error.name === 'NotAllowedError') {
                setError('Tap the play button again to start playback');
              } else {
                setError('Error playing audio: ' + error.message);
              }
              setIsPlaying(false);
            });
        } else {
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Toggle playback error:', error);
      setError('Error controlling playback: ' + error.message);
      setIsPlaying(false);
    }
  };

  return (
    <Card className="voice-chat-interface">
      <Card.Body>
        <div className="voice-controls">
          <Form.Check 
            type="switch"
            id="instant-send-switch"
            label="Instant Send"
            checked={isInstantSend}
            onChange={(e) => setIsInstantSend(e.target.checked)}
            className="mb-3"
          />

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
              <Mic /> {isInstantSend ? 'Start Recording (Auto-send)' : 'Start Recording'}
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
              {/* Only show button if audio is playing or failed to autoplay */}
              {(isPlaying || error) && (
                <Button 
                  variant="light" 
                  onClick={togglePlayback}
                  className="play-response"
                >
                  <Pause /> Stop Response
                </Button>
              )}
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default VoiceTab;
