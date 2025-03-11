import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Spinner } from 'react-bootstrap';
import { Mic, Square, X, Pause, Play } from 'lucide-react';
import './StreamingVoiceTab.css';
import { fetchWithAuth } from "../../utils/fetchWithAuth";

const StreamingVoiceTab = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isStreamComplete, setIsStreamComplete] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const audioChunksRef = useRef([]);

  // MediaSource refs
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const audioElementRef = useRef(null);
  const pendingChunksRef = useRef([]);
  const isSourceOpenRef = useRef(false);

  // Add ref for tracking stream state
  const isStreamCompleteRef = useRef(false);
  const isCancelledRef = useRef(false);
  const lastAudioUpdateRef = useRef(Date.now());
  const playbackTimeoutRef = useRef(null);

  // Add new refs for request handling
  const isSubmittingRef = useRef(false);
  const currentRequestControllerRef = useRef(null);
  const isTransitioningRef = useRef(false);  // Add this new ref

  // Add new ref for tracking playback completion
  const isPlaybackCompleteRef = useRef(false);

  const initializeAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const setupMediaSource = async () => {
    const audio = new Audio();
    audio.autoplay = true;
    const mediaSource = new MediaSource();

    return new Promise((resolve) => {
      mediaSource.addEventListener('sourceopen', () => {
        try {
          // First, remove any existing source buffers
          if (mediaSource.sourceBuffers.length > 0) {
            Array.from(mediaSource.sourceBuffers).forEach(buffer => {
              try {
                mediaSource.removeSourceBuffer(buffer);
              } catch (e) {
                console.warn('Error removing source buffer:', e);
              }
            });
          }

          const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
          if (!sourceBuffer) {
            throw new Error('Failed to create source buffer');
          }          

          sourceBuffer.mode = 'sequence';
          audioElementRef.current = audio;
          mediaSourceRef.current = mediaSource;
          sourceBufferRef.current = sourceBuffer;
          isSourceOpenRef.current = true;
          isPlaybackCompleteRef.current = false;

          sourceBuffer.addEventListener('updateend', () => {
            if (pendingChunksRef.current.length > 0 && !sourceBuffer.updating) {
              processPendingChunks();
            }
          });

          // Add event listeners for tracking playback
          audio.addEventListener('ended', handlePlaybackComplete);
          audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e, 
            e.target.error ? `Error details: ${e.target.error.message || e.target.error.code}` : 'No error details available');
          handlePlaybackComplete();
          });

          resolve();
        } catch (error) {
          console.error('Error setting up MediaSource:', error);
          setError('Error setting up audio playback');
          resolve(); // Resolve anyway to prevent hanging
        }
      });

      audio.src = URL.createObjectURL(mediaSource);
      
      audio.addEventListener('timeupdate', () => {
        lastAudioUpdateRef.current = Date.now();
      });

      audio.addEventListener('ended', () => {
        cleanupStates(true);
      });
    });
  };

  const handlePlaybackComplete = () => {
    console.log('Playback completed');
    isPlaybackCompleteRef.current = true;
    cleanupStates(true);
    console.log(('calling cleanupAudio(false) from handlePlaybackComplete'));
    setTimeout(() => cleanupAudio(false), 100);
  };

  const cleanupAudio = (preserveRequest = false) => {
    try {
      console.log('Entered cleanupAudio:', {
        preserveRequest,
        currentStates: {
          isStreamComplete: isStreamCompleteRef.current,
          isPlaybackComplete: isPlaybackCompleteRef.current,
          isSubmitting: isSubmittingRef.current
        }
      });
      // Only cleanup if playback is complete or we're explicitly not preserving the request
      if (isPlaybackCompleteRef.current || !preserveRequest) {
        if (currentRequestControllerRef.current && !isStreamCompleteRef.current) {
          currentRequestControllerRef.current.abort();
        }
        currentRequestControllerRef.current = null;
        isSubmittingRef.current = false;

        // Remove event listeners before cleanup
        if (audioElementRef.current) {
          audioElementRef.current.removeEventListener('ended', handlePlaybackComplete);
          audioElementRef.current.pause();
          audioElementRef.current.src = '';
          audioElementRef.current = null;
        }

        if (mediaSourceRef.current?.readyState === 'open') {
          try {
            if (mediaSourceRef.current.sourceBuffers.length > 0) {
              Array.from(mediaSourceRef.current.sourceBuffers).forEach(buffer => {
                if (!buffer.updating) {
                  mediaSourceRef.current.removeSourceBuffer(buffer);
                }
              });
            }
            mediaSourceRef.current.endOfStream();
          } catch (e) {
            console.warn('Non-critical: Could not end media stream:', e);
          }
        }
        mediaSourceRef.current = null;
        sourceBufferRef.current = null;
        isSourceOpenRef.current = false;
        pendingChunksRef.current = [];

        // Reset states
        isStreamCompleteRef.current = false;
        isPlaybackCompleteRef.current = false;
        setIsStreamComplete(false);
      }
    } catch (error) {
      console.warn('Non-critical cleanup error:', error);
    }
  };

  const processPendingChunks = () => {
    if (!sourceBufferRef.current || sourceBufferRef.current.updating) {
      return;
    }

    if (pendingChunksRef.current.length > 0) {
      const chunk = pendingChunksRef.current.shift();
      try {
        sourceBufferRef.current.appendBuffer(chunk);
      } catch (error) {
        console.error('Error appending buffer:', error);
      }
    }
  };

  const handleAudioChunk = async (arrayBuffer) => {
    lastAudioUpdateRef.current = Date.now();
    console.log('In handleAudioChunk - Received audio chunk:', arrayBuffer.byteLength);
    if (sourceBufferRef.current?.updating) {
      pendingChunksRef.current.push(arrayBuffer);
    } else {
      try {
        sourceBufferRef.current?.appendBuffer(arrayBuffer);
      } catch (error) {
        console.error('Error appending buffer:', error);
        pendingChunksRef.current.push(arrayBuffer);
      }
    }

    if (!isPlaying) {
      setIsPlaying(true);
      setIsProcessing(false);
    }
  };

  const handleAudioStream = async (response) => {
    let reader;
    try {
      isTransitioningRef.current = true;
      isPlaybackCompleteRef.current = false;
      console.log("Entered handleAudioStream");
      // Clean up old media resources but preserve the request
      console.log(('calling cleanupAudio(false) from handleAudioStream'));
      cleanupAudio(true);
      
      // Setup new media source
      await setupMediaSource();
      
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      isTransitioningRef.current = false;

      while (true) {
        if (isCancelledRef.current || isPlaybackCompleteRef.current) {
          break;
        }

        const { value, done } = await reader.read();
        
        if (done) {
          console.log('In handleAudioStream - received done. Stream complete');
          isStreamCompleteRef.current = true;
          setIsStreamComplete(true);
          setIsProcessing(false);
          
          if (mediaSourceRef.current?.readyState === 'open') {
            try {
              mediaSourceRef.current.endOfStream();
            } catch (e) {
              console.warn('Non-critical error ending media stream:', e);
            }
          }
          break;
        }

        const chunk = decoder.decode(value);
        buffer += chunk;

        const chunks = buffer.split('\n');
        buffer = chunks.pop() || '';

        for (const chunk of chunks) {
          if (chunk.trim()) {
            try {
              const audioData = atob(chunk);
              const arrayBuffer = new Uint8Array(audioData.length);
              for (let i = 0; i < audioData.length; i++) {
                arrayBuffer[i] = audioData.charCodeAt(i);
              }
              await handleAudioChunk(arrayBuffer.buffer);
            } catch (error) {
              console.error('Error processing chunk:', error);
            }
          }
        }
      }
    } catch (error) {
      if (isTransitioningRef.current) {
        console.log('Stream cleanup during transition - ignoring error');
        return;
      }
      if (error.name === 'AbortError' && isStreamCompleteRef.current) {
        return;
      }
      console.error('Error processing audio stream:', error);
      setError('Error processing audio stream');
      setIsProcessing(false);
    } finally {
      isTransitioningRef.current = false;
      if (reader) {
        try {
          await reader.cancel();
        } catch (e) {
          console.warn('Non-critical: Error canceling reader:', e);
        }
      }
    }
  };

  const handleSend = async () => {
    if (!mediaRecorderRef.current || !isRecording || isSubmittingRef.current) {
      return;
    }

    try {
      isSubmittingRef.current = true;

      // Cancel any existing request
      if (currentRequestControllerRef.current) {
        currentRequestControllerRef.current.abort();
      }

      // Create new AbortController for this request
      const controller = new AbortController();
      currentRequestControllerRef.current = controller;

      // Initialize audio context with user gesture
      await initializeAudioContext();
      
      isCancelledRef.current = false;
      const recorder = mediaRecorderRef.current;
      
      recorder.stop();
      recorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);

      if (audioChunksRef.current.length === 0) {
        console.warn('No audio recorded');
        return;
      }

      setIsProcessing(true);

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const base64Audio = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      console.log('Calling /streaming-voice-chat/ from handleSend() - Sending audio to server:', base64Audio.length);
      const response = await fetchWithAuth('/streaming-voice-chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          audio: base64Audio.split(',')[1],
          stream: true
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok (${response.status})`);
      }

      await handleAudioStream(response);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was cancelled');
        return;
      }
      console.error('Error sending audio:', error);
      setError('Error sending audio: ' + error.message);
      setIsProcessing(false);
    } finally {
      isSubmittingRef.current = false;
      currentRequestControllerRef.current = null;
    }
  };

  // Update pause/resume handlers to work with MediaSource
  const handlePausePlayback = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleResumePlayback = () => {
    if (audioElementRef.current) {
      audioElementRef.current.play();
      setIsPaused(false);
      setIsPlaying(true);
    }
  };

  const stopPlayback = () => {
    console.log('Calling cleanupAudio() from stopPlayback');
    cleanupAudio();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const startRecording = async () => {
    console.log('Starting recording');
    // Reset cancellation flag
    isCancelledRef.current = false;
    
    // Clear any existing errors first
    setError(null);
    
    try {
      // Initialize AudioContext first
      await initializeAudioContext();
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording');
      }

      // Stop any active recording first
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.onstop = () => {};
            mediaRecorderRef.current.ondataavailable = () => {};
            mediaRecorderRef.current.stop();
          }
          const tracks = mediaRecorderRef.current.stream.getTracks();
          tracks.forEach(track => track.stop());
          mediaRecorderRef.current = null;
        } catch (e) {
          console.warn('Error cleaning up previous recording:', e);
        }
      }
      
      // Clean up any existing audio resources
      try {
        if (audioElementRef.current) {
          audioElementRef.current.pause();
        }
        console.log('Calling cleanupAudio() from startRecording');
        cleanupAudio();
      } catch (err) {
        console.warn('Non-critical error cleaning up before recording:', err);
      }
      
      // Reset UI states
      setIsPlaying(false);
      setIsPaused(false);
      
      // Reset audio chunks
      audioChunksRef.current = [];

      // Now resume AudioContext if needed
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('AudioContext resumed successfully');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = 'audio/webm';
      
      // Rest of the startRecording function remains the same
      // Start with minimal options to ensure broader compatibility
      const options = mimeType ? { mimeType, audioBitsPerSecond: 128000 } : undefined;
      
      // Create a new MediaRecorder instance
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      
      // Ensure audio chunks array is empty before starting
      audioChunksRef.current = [];

      // Set up the data available event handler
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log(`Adding audio chunk: ${event.data.size} bytes`);
          audioChunksRef.current.push(event.data);
        }
      };

      // Set up the stop event handler
      recorder.onstop = async () => {
        console.log('MediaRecorder stopped, chunks collected:', audioChunksRef.current.length);
        // Store a local reference since mediaRecorderRef.current might be null when this executes
        const recorder = mediaRecorderRef.current;
        
        try {
          // Check cancellation flag before proceeding
          if (isCancelledRef.current) {
            console.log('Recording was cancelled, skipping sending to server');
            setIsProcessing(false);
            return;
          }
          
          // Log the current audio chunks
          console.log(`recorder.onstop: Collected ${audioChunksRef.current.length} audio chunks`);
          
          // If we're canceling (no chunks), just clean up
          if (!audioChunksRef.current.length) {
            console.warn('No audio chunks recorded - likely canceled');
            setIsRecording(false);
            setIsProcessing(false);
            return;
          }
          // Don't make API call here - that will happen in handleSend()
          setIsRecording(false);

        } catch (error) {
          console.error('Error processing recording:', error);
          setError('Error processing recording: ' + (error.message || 'Unknown error'));
          setIsProcessing(false);
        }
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error: ' + (event.error?.message || 'Unknown error'));
        setIsRecording(false);
        setIsProcessing(false);
      };

      // Start recording with a timeslice to ensure data is collected periodically
      // This ensures ondataavailable is called regularly, not just on stop
      setTimeout(() => {
        try {
          recorder.start(1000); // Request data every second
          setIsRecording(true);
          console.log('MediaRecorder started with timeslice 1000ms');
        } catch (err) {
          console.error('Error starting recording:', err);
          setError('Error starting recording: ' + err.message);
        }
      }, 100);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Error accessing microphone: ' + err.message);
    }
  };

  const handleCancel = () => {
    console.log('Canceling recording');
    
    // Set cancellation flag FIRST - this is crucial
    isCancelledRef.current = true;
    
    // Clear any existing errors
    setError(null);
    
    // Reset states first - before any async operations
    setIsRecording(false);
    setIsPlaying(false);
    setIsProcessing(false);
    setIsPaused(false);
    
    // Clear audio chunks FIRST to ensure no data is sent even if handlers still fire
    audioChunksRef.current = [];
    
    if (mediaRecorderRef.current) {
      try {
        // Important: Remove the onstop handler completely before stopping
        // This ensures we don't trigger data sending when canceling
        const recorder = mediaRecorderRef.current;
        recorder.onstop = null;  // Remove the handler completely
        recorder.ondataavailable = null;  // Remove data handler too
        
        if (recorder.state !== 'inactive') {
          try {
            recorder.stop();
            console.log('MediaRecorder stopped');
          } catch (e) {
            console.warn('Error stopping media recorder:', e);
          }
        }
        
        // Always stop all tracks
        const tracks = recorder.stream.getTracks();
        tracks.forEach(track => {
          track.stop();
          console.log('Track stopped:', track.kind);
        });
        
        // Explicitly set to null to free memory
        mediaRecorderRef.current = null;
      } catch (error) {
        console.warn('Error stopping media recorder tracks:', error);
      }
    }
    
    // Complete audio cleanup after a short delay to avoid state conflicts
    setTimeout(() => {
      try {
        console.log('Calling cleanupAudio() from setTimeout');
        cleanupAudio();
        console.log('Recording canceled and states reset');
      } catch (error) {
        console.warn('Non-critical cleanup error:', error);
      }
    }, 100);
  };

  const cleanupStates = (includePlayback = true) => {
    console.log('Cleaning up states:', {
      includePlayback,
      currentStates: {
        isPlaying,
        isPaused,
        isProcessing
      }
    });

    if (includePlayback) {
      setIsPlaying(false);
      setIsPaused(false);
    }
    setIsProcessing(false);
  };

  // Component cleanup
  useEffect(() => {
    return () => {
      isPlaybackCompleteRef.current = true;
      if (currentRequestControllerRef.current) {
        currentRequestControllerRef.current.abort();
      }
      console.log('Calling cleanupAudio(false) from useEffect cleanup');
      cleanupAudio(false);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <Card className="streaming-voice-interface">
      <Card.Body>
        <div className="voice-controls">
          {error && (
            <div className="error-message alert alert-danger">
              {error}
              <Button 
                variant="outline-danger" 
                size="sm"
                onClick={() => setError(null)}
              >
                <X size={16} />
              </Button>
            </div>
          )}

          {!isRecording && !isProcessing && !isPlaying && !isPaused && (
            <Button 
              variant="primary" 
              className="record-button"
              onClick={startRecording}
            >
              <Mic /> Click to speak
            </Button>
          )}

          {isRecording && (
            <div className="recording-controls">
              <div className="recording-buttons">
                <Button 
                  variant="success" 
                  className="send-button"
                  onClick={handleSend}
                >
                  Send
                </Button>
                <Button 
                  variant="danger" 
                  className="cancel-button"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </div>
              <div className="recording-indicator">
                Recording... <span className="pulse"></span>
              </div>
            </div>
          )}

          {isProcessing && !isPlaying && !isPaused && (
            <div className="streaming-indicator">
              <Spinner animation="border" size="sm" />
              Processing...
            </div>
          )}

          {(isPlaying || isPaused) && (
            <div className="playback-controls">
              {isPaused ? (
                <Button 
                  variant="primary"
                  onClick={handleResumePlayback}
                  className="control-button"
                >
                  <Play size={20} />
                </Button>
              ) : (
                <Button 
                  variant="primary"
                  onClick={handlePausePlayback}
                  className="control-button"
                >
                  <Pause size={20} />
                </Button>
              )}
              <Button 
                variant="danger"
                onClick={stopPlayback}
                className="control-button"
              >
                <Square size={20} />
              </Button>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default StreamingVoiceTab;
