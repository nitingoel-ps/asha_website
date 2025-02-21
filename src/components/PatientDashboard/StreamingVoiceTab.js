import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Spinner } from 'react-bootstrap';
import { Mic, Square, X } from 'lucide-react';
import './StreamingVoiceTab.css';
import { fetchWithAuth } from "../../utils/fetchWithAuth";

const StreamingVoiceTab = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [canPlay, setCanPlay] = useState(false);
  const [responseUrl, setResponseUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const audioBuffersRef = useRef([]);
  const audioChunksRef = useRef([]);

  // Add new state for audio queue
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);

  // Add new refs for MSE
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const audioElementRef = useRef(null);
  const pendingChunksRef = useRef([]);
  const isSourceOpenRef = useRef(false);

  // Add new state for mobile detection
  const [isMobile] = useState(() => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || !window.MediaSource;
  });

  useEffect(() => {
    // Initialize AudioContext
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const setupMediaSource = () => {
    return new Promise((resolve) => {
      // Create new audio element and MediaSource
      const audio = new Audio();
      audio.autoplay = true;
      const mediaSource = new MediaSource();
      
      mediaSource.addEventListener('sourceopen', () => {
        console.log('MediaSource opened');
        try {
          const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
          sourceBuffer.mode = 'sequence';
          
          // Store references
          audioElementRef.current = audio;
          mediaSourceRef.current = mediaSource;
          sourceBufferRef.current = sourceBuffer;
          isSourceOpenRef.current = true;

          // Setup sourceBuffer update end handler
          sourceBuffer.addEventListener('updateend', () => {
            if (pendingChunksRef.current.length > 0 && !sourceBuffer.updating) {
              processPendingChunks();
            }
          });

          resolve();
        } catch (error) {
          console.error('Error setting up MediaSource:', error);
          setError('Error setting up audio playback');
        }
      });

      audio.src = URL.createObjectURL(mediaSource);
    });
  };

  const setupAudioPlayback = () => {
    if (isMobile) {
      // For mobile, use simple Audio element
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.autoplay = true;
        audioElementRef.current = audio;
        resolve();
      });
    } else {
      // Use existing MediaSource setup for desktop
      return setupMediaSource();
    }
  };

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/aac',
      ''
    ];
    
    for (const type of types) {
      if (type === '' || MediaRecorder.isTypeSupported(type)) {
        console.log('Using MIME type:', type || 'browser default');
        return type;
      }
    }
    throw new Error('No supported audio MIME type found');
  };

  const playNextChunk = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }

    isPlayingRef.current = true;
    setIsPlaying(true);

    const nextChunk = audioQueueRef.current.shift();
    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(nextChunk);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
      }
      audioSourceRef.current = source;

      source.onended = () => {
        audioSourceRef.current = null;
        playNextChunk(); // Play next chunk when current one ends
      };

      source.start(0);
    } catch (error) {
      console.error('Error playing audio chunk:', error);
      playNextChunk(); // Try next chunk if current fails
    }
  };

  const queueAudioChunk = async (arrayBuffer) => {
    audioQueueRef.current.push(arrayBuffer);
    
    // Start playback if not already playing
    if (!isPlayingRef.current) {
      playNextChunk();
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

  const appendChunkToSourceBuffer = async (chunk) => {
    // If MediaSource isn't set up or has been closed, set it up again
    if (!mediaSourceRef.current || mediaSourceRef.current.readyState === 'closed') {
      await setupMediaSource();
    }

    if (!isSourceOpenRef.current || !sourceBufferRef.current) {
      console.log('Queuing chunk - source not ready');
      pendingChunksRef.current.push(chunk);
      return;
    }

    try {
      if (sourceBufferRef.current.updating) {
        pendingChunksRef.current.push(chunk);
      } else {
        sourceBufferRef.current.appendBuffer(chunk);
      }
    } catch (error) {
      console.error('Error appending buffer:', error);
      if (error.name === 'InvalidStateError') {
        // If we get an invalid state, try to reset the MediaSource
        await setupMediaSource();
        pendingChunksRef.current.push(chunk);
      }
    }
  };

  const waitForUpdateEnd = () => {
    return new Promise((resolve) => {
      if (!sourceBufferRef.current || !sourceBufferRef.current.updating) {
        resolve();
        return;
      }

      const handleUpdateEnd = () => {
        sourceBufferRef.current.removeEventListener('updateend', handleUpdateEnd);
        resolve();
      };

      sourceBufferRef.current.addEventListener('updateend', handleUpdateEnd);
    });
  };

  const endMediaStream = async () => {
    try {
      if (mediaSourceRef.current?.readyState === 'open') {
        // Wait for any pending updates to complete
        await waitForUpdateEnd();
        mediaSourceRef.current.endOfStream();
      }
    } catch (error) {
      console.warn('Error ending media stream:', error);
    }
  };

  const cleanupAudio = () => {
    console.log('Cleaning up audio resources');
    if (audioElementRef.current) {
      console.log('Stopping and cleaning audio element');
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      if (audioElementRef.current.srcObject) {
        audioElementRef.current.srcObject = null;
      }
    }
    audioBuffersRef.current = [];
    console.log('Audio buffers cleared');
  };

  const handleAudioChunk = async (arrayBuffer, isFirstChunk = false) => {
    console.log(`Handling audio chunk, isFirstChunk: ${isFirstChunk}, size: ${arrayBuffer.byteLength}`);
    if (isMobile) {
      audioBuffersRef.current.push(arrayBuffer);
      console.log(`Mobile: Added chunk to buffer, total chunks: ${audioBuffersRef.current.length}`);
      
      if (isFirstChunk) {
        console.log('Mobile: First chunk received');
        cleanupAudio(); // Clean up any existing audio
        
        // Create blob from all chunks received so far
        const blob = new Blob(audioBuffersRef.current, { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        console.log('Created blob URL:', url);
        
        // Save URL for play button
        setResponseUrl(url);
        setCanPlay(true);
        
        const audio = new Audio();
        audio.oncanplay = () => console.log('Audio can play');
        audio.onplay = () => {
          console.log('Audio started playing');
          setIsPlaying(true);
        };
        audio.onended = () => {
          console.log('Audio playback ended');
          setIsPlaying(false);
        };
        audio.onerror = (e) => console.error('Audio error:', e);
        
        audio.src = url;
        audioElementRef.current = audio;
      }
    } else {
      await appendChunkToSourceBuffer(arrayBuffer);
    }
  };

  const handleAudioStream = async (response) => {
    console.log('Starting to handle audio stream');
    cleanupAudio(); // Clean up before starting new stream
    
    // Reset audio state
    audioBuffersRef.current = [];
    
    // Setup new audio playback
    await setupAudioPlayback();
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let isFirstChunk = true;
    
    try {
      // Resume AudioContext if it's suspended (needed for Safari)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          if (mediaSourceRef.current?.readyState === 'open') {
            mediaSourceRef.current.endOfStream();
          }
          break;
        }

        // Decode the chunk to text
        const chunk = decoder.decode(value);
        buffer += chunk;

        // Split by newline and process complete chunks
        const chunks = buffer.split('\n');
        buffer = chunks.pop() || ''; // Keep the last incomplete chunk in buffer

        for (const chunk of chunks) {
          if (chunk.trim()) {
            try {
              // Convert base64 to ArrayBuffer
              const audioData = atob(chunk);
              const arrayBuffer = new Uint8Array(audioData.length);
              for (let i = 0; i < audioData.length; i++) {
                arrayBuffer[i] = audioData.charCodeAt(i);
              }

              await handleAudioChunk(arrayBuffer.buffer, isFirstChunk);
              isFirstChunk = false;
            } catch (error) {
              console.error('Error processing chunk:', error);
              console.log('Problematic chunk:', chunk.slice(0, 100) + '...');
            }
          }
        }
      }

      // Process any remaining data
      if (buffer.trim()) {
        try {
          const audioData = atob(buffer);
          const arrayBuffer = new Uint8Array(audioData.length);
          for (let i = 0; i < audioData.length; i++) {
            arrayBuffer[i] = audioData.charCodeAt(i);
          }
          await handleAudioChunk(arrayBuffer.buffer, isFirstChunk);
        } catch (error) {
          console.error('Error processing final chunk:', error);
        }
      }

      // End the stream properly
      if (!isMobile && mediaSourceRef.current?.readyState === 'open') {
        await endMediaStream();
      }
    } catch (error) {
      console.error('Error processing audio stream:', error);
      setError('Error processing audio stream');
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    console.log('Starting recording');
    cleanupAudio(); // Clean up any existing audio before starting new recording
    
    try {
      setError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: mediaRecorderRef.current.mimeType || 'audio/webm' 
          });

          // Convert blob to base64
          const base64Audio = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(audioBlob);
          });

          setIsProcessing(true);
          const response = await fetchWithAuth('/voice-chat/', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json'
              // Removed Accept: 'audio/mpeg' since we're expecting base64
            },
            body: JSON.stringify({ 
              audio: base64Audio.split(',')[1],
              stream: true
            })
          });

          if (!response.ok) throw new Error('Network response was not ok');
          
          // Handle streaming response
          handleAudioStream(response);

        } catch (error) {
          console.error('Error processing recording:', error);
          setError('Error processing recording: ' + error.message);
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Error accessing microphone: ' + err.message);
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
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    audioQueueRef.current = []; // Clear the queue
    isPlayingRef.current = false;
    
    // Use the new endMediaStream function
    endMediaStream().then(() => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
      pendingChunksRef.current = [];
      setIsRecording(false);
      setIsPlaying(false);
      setIsProcessing(false);
    });
  };

  const handleSend = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleCancel = () => {
    console.log('Canceling recording');
    cleanupAudio();
    
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping media recorder tracks');
      mediaRecorderRef.current.stream.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped:', track.kind);
      });
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    }

    // Reset all states
    setIsRecording(false);
    setIsPlaying(false);
    setIsProcessing(false);
    console.log('Recording canceled and states reset');
  };

  const playResponse = async () => {
    console.log('Attempting to play response');
    if (!audioElementRef.current || !responseUrl) {
      console.log('No audio available to play');
      return;
    }

    try {
      await audioElementRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      setError('Could not play audio: ' + error.message);
    }
  };

  useEffect(() => {
    return () => {
      console.log('Component unmounting, cleaning up resources');
      cleanupAudio();
      if (!isMobile && mediaSourceRef.current?.readyState === 'open') {
        endMediaStream();
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        if (audioElementRef.current.src) {
          URL.revokeObjectURL(audioElementRef.current.src);
        }
      }
    };
  }, [isMobile]);

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

          {!isRecording && !isProcessing && (
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

          {isProcessing && (
            <div className="streaming-indicator">
              <Spinner animation="border" size="sm" />
              {isPlaying ? 'Playing response...' : 'Processing...'}
            </div>
          )}

          {/* Add play button for mobile */}
          {isMobile && canPlay && !isRecording && !isProcessing && (
            <Button 
              variant="primary"
              onClick={playResponse}
              className="play-button"
            >
              {isPlaying ? 'Playing...' : 'Play Response'}
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default StreamingVoiceTab;
