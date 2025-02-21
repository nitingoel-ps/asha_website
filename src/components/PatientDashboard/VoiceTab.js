import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Spinner, Form } from 'react-bootstrap';  // Add Form import
import { Mic, Square, Send, X, Play, Pause } from 'lucide-react';
import './VoiceTab.css';
import { fetchWithAuth } from "../../utils/fetchWithAuth";

const VoiceTab = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [showPlaybackControl, setShowPlaybackControl] = useState(true);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  
  const cancelingRef = useRef(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(new Audio());

  // Add useEffect hook to handle component mount and unmount
  useEffect(() => {
    console.log("VoiceTab mounted");
    return () => {
    console.log("VoiceTab unmounted");
    };
  }, []);

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
      audioChunksRef.current = []; // Reset chunks at start
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
        console.log('Recording stopped, isCanceling:', cancelingRef.current);
        
        // Store chunks in a local variable and clear the ref immediately
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        
        if (cancelingRef.current) {
          cancelingRef.current = false;
          setIsProcessing(false);
          return;
        }

        try {
          const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
          const audioBlob = new Blob(chunks, { type: mimeType });
          console.log('Created audio blob:', { 
            size: audioBlob.size, 
            type: audioBlob.type,
            chunks: audioChunksRef.current.length 
          });

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
            setShowPlaybackControl(true);
            setNeedsManualPlay(false);
          } catch (error) {
            console.log('Autoplay failed, showing play button:', error);
            setNeedsManualPlay(true);
            setShowPlaybackControl(true);
          }
          
          setIsProcessing(false);
          
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

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      setIsProcessing(true);
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Update cancelRecording to properly clean up
  const cancelRecording = () => {
    console.log('Canceling recording...');
    cancelingRef.current = true;  // Use ref instead of state
    audioChunksRef.current = []; // Clear chunks immediately
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
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
    setAudioUrl(null);
    setIsPlaying(false);
    console.log('Recording canceled and cleaned up');
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
        setShowPlaybackControl(false); // Hide control after stopping
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

  const handleInitialPlay = async () => {
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setNeedsManualPlay(false);
      setShowPlaybackControl(true);
    } catch (error) {
      console.error('Manual play failed:', error);
      setError('Playback failed: ' + error.message);
    }
  };

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

          {!isRecording && !isProcessing && !isPlaying && !needsManualPlay && (
            <Button 
              variant="primary" 
              className="record-button"
              onClick={startRecording}
            >
              <Mic /> Click to Speak
            </Button>
          )}

          {needsManualPlay && (
            <Button 
              variant="primary" 
              className="record-button"
              onClick={handleInitialPlay}
            >
              <Play /> Play Response
            </Button>
          )}

          {isPlaying && showPlaybackControl && (
            <Button 
              variant="light" 
              onClick={togglePlayback}
              className="record-button"
            >
              <Pause /> Stop Playback
            </Button>
          )}

          {isRecording && (
            <div className="recording-controls">
              <div className="recording-buttons">
                <Button 
                  variant="success" 
                  className="send-button"
                  onClick={stopAndSendRecording}
                >
                  <Send /> Send
                </Button>
                <Button 
                  variant="danger" 
                  onClick={cancelRecording}
                >
                  <X /> Cancel
                </Button>
              </div>
              <div className="recording-indicator">
                Recording... <span className="pulse"></span>
              </div>
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
              <pre className="response-text">
                {response.text}
              </pre>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default VoiceTab;
