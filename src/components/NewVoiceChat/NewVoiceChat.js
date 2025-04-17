import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Card, Spinner, Alert } from 'react-bootstrap';
import { Mic, Send, X, PlayCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './NewVoiceChat.css';
import SimpleVoiceVisualizer from './SimpleVoiceVisualizer';

// Debug mode for verbose logging
const DEBUG = true;

// Debug log function
const debugLog = (...args) => {
  if (DEBUG) {
    console.log('[NewVoiceChat]', ...args);
  }
};

// Utility to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return window.btoa(binary);
};

// Utility to convert Base64 to ArrayBuffer
const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Get WebSocket state as a string for debugging
const getWebSocketStateString = (readyState) => {
  switch (readyState) {
    case WebSocket.CONNECTING: return 'CONNECTING';
    case WebSocket.OPEN: return 'OPEN';
    case WebSocket.CLOSING: return 'CLOSING';
    case WebSocket.CLOSED: return 'CLOSED';
    default: return 'UNKNOWN';
  }
};

const NewVoiceChat = () => {
  const { sessionId } = useParams();
  const { logout } = useAuth();

  // States for recording and connection
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  
  // Playback states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waitingForPlayback, setWaitingForPlayback] = useState(false);
  const [currentAudioLevel, setCurrentAudioLevel] = useState(0);

  // Refs for maintaining connection state
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const audioElementRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const audioAnalyserRef = useRef(null);
  const processingCompleteRef = useRef(false);
  const userInteractionRef = useRef(false);
  const isCleaningUpRef = useRef(false);

  // Get API base URL from environment
  const apiBaseURL = process.env.REACT_APP_API_BASE_URL || '';
  debugLog('API Base URL:', apiBaseURL);

  // Setup WebSocket connection
  const setupWebSocket = () => {
    try {
      // Check if already connecting
      if (socketRef.current && socketRef.current.readyState === WebSocket.CONNECTING) {
        debugLog('WebSocket connection already in progress');
        return;
      }

      // Close any existing connection
      if (socketRef.current) {
        debugLog('Closing existing WebSocket connection');
        socketRef.current.close();
      }

      // Set connecting state
      setIsConnecting(true);
      setIsConnected(false);

      // Determine WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsUrl = '';

      if (apiBaseURL) {
        if (apiBaseURL.startsWith('http')) {
          // Remove http(s):// and replace with ws(s)://
          const serverUrl = apiBaseURL.replace(/^http(s?):\/\//, '');
          wsUrl = `${protocol}//${serverUrl}/ws/voice`;
        } else {
          wsUrl = `${protocol}//${apiBaseURL}/ws/voice`;
        }
      } else {
        // Fallback to same host
        wsUrl = `${protocol}//${window.location.host}/ws/voice`;
      }

      // Add authentication token if available
      const authToken = localStorage.getItem('access_token');
      if (authToken) {
        debugLog('Adding authentication token to WebSocket URL');
        wsUrl = `${wsUrl}?token=${authToken}`;
      } else {
        debugLog('No authentication token found');
        setError('Authentication required. Please log in again.');
        setIsConnecting(false);
        setTimeout(() => {
          logout();
        }, 3000);
        return null;
      }

      // Add session ID if provided
      if (sessionId && !wsUrl.includes('?')) {
        wsUrl += `?session_id=${sessionId}`;
      } else if (sessionId) {
        wsUrl += `&session_id=${sessionId}`;
      }

      debugLog('Connecting to WebSocket:', wsUrl);

      // Create new WebSocket
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      // Set up connection timeout
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          debugLog('WebSocket connection timeout');
          setError('Connection timeout. Could not connect to the server.');
          setIsConnecting(false);
          socket.close();
        }
      }, 10000);

      // Set up event handlers
      socket.onopen = () => {
        clearTimeout(connectionTimeout);
        debugLog('WebSocket connection established');
        setIsConnecting(false);
        setIsConnected(true);
        setError(null);
      };

      socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        debugLog(`WebSocket connection closed: ${event.code} - ${event.reason}`);
        setIsConnecting(false);
        setIsConnected(false);
        
        if (event.code === 1000) {
          // Normal closure
          debugLog('WebSocket closed normally');
        } else if (event.code === 1006) {
          // Abnormal closure
          setError('Connection lost. Please check your internet connection.');
        } else if (event.code === 4001 || 
                  event.code === 1008 || 
                  (event.reason && (
                    event.reason.toLowerCase().includes('unauthoriz') || 
                    event.reason.toLowerCase().includes('forbidden') ||
                    event.reason.toLowerCase().includes('auth') ||
                    event.reason.includes('403') ||
                    event.reason.includes('401')))) {
          // Authentication error
          setError('Authentication failed. Please log in again.');
          setTimeout(() => {
            logout();
          }, 3000);
        } else {
          setError(`Connection closed (${event.code}). Please try again.`);
        }
      };

      socket.onerror = (error) => {
        clearTimeout(connectionTimeout);
        debugLog('WebSocket error:', error);
        setIsConnecting(false);
        setIsConnected(false);
        setError('Connection error. Please try again later.');
      };

      socket.onmessage = handleWebSocketMessage;

      return socket;
    } catch (error) {
      debugLog('Error setting up WebSocket:', error);
      setIsConnecting(false);
      setIsConnected(false);
      setError(`Failed to connect: ${error.message}`);
      return null;
    }
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const messageTime = new Date().toISOString();
      debugLog(`[${messageTime}] WebSocket message received:`, data.type);

      switch (data.type) {
        case 'transcript':
        case 'transcript_update':
          // Handle both transcript and transcript_update similarly
          if (data.transcript) {
            debugLog(`Received transcript: "${data.transcript}"`);
            setTranscription(data.transcript);
          } else if (data.full_transcript) {
            // Some implementations might send full_transcript instead
            debugLog(`Received full transcript: "${data.full_transcript}"`);
            setTranscription(data.full_transcript);
          }
          break;

        case 'transcript_final':
          // Final transcription
          if (data.transcript) {
            debugLog(`Received final transcript: "${data.transcript}"`);
            setTranscription(data.transcript);
          }
          break;

        case 'audio_chunk':
          // Log audio chunk details
          const audioLength = data.audio ? data.audio.length : 0;
          debugLog(`Received audio chunk: ${audioLength} bytes`);
          
          if (data.audio) {
            handleAudioChunk(data.audio);
          }
          
          // Some implementations may also include response text
          if (data.text) {
            debugLog(`Received response text: "${data.text}"`);
            // Append to existing text to build up the response
            setAiResponse(prev => {
              if (!prev) return data.text;
              if (prev.endsWith(" ") || data.text.startsWith(" ")) {
                return prev + data.text;
              }
              // Add space between chunks if needed
              return prev + " " + data.text;
            });
          }
          break;

        case 'processing_complete':
          debugLog('Processing complete message received');
          processingCompleteRef.current = true;
          
          // If not currently playing, clean up the UI
          if (!isPlayingRef.current && audioQueueRef.current.length === 0) {
            handlePlaybackComplete();
          }
          break;

        case 'stream_started':
          debugLog('Server acknowledged stream start');
          break;
          
        case 'error':
          debugLog('Error from server:', data.message);
          setError(data.message || 'An error occurred');
          
          // If recording, stop it
          if (isRecording) {
            stopRecording(false);
          }
          break;
          
        case 'no_speech_detected':
          debugLog('No speech detected');
          setError('No speech detected. Please try again.');
          
          // Stop recording if still recording
          if (isRecording) {
            stopRecording(false);
          }
          break;

        case 'cancelled':
          debugLog('Server acknowledged cancellation');
          setIsProcessing(false);
          break;

        default:
          debugLog('Unknown message type:', data.type, data);
      }
    } catch (error) {
      debugLog('Error parsing WebSocket message:', error);
    }
  };

  // Handle audio chunks from server
  const handleAudioChunk = async (audioData) => {
    try {
      const chunkId = Date.now().toString();
      debugLog(`Processing audio chunk ${chunkId} of length: ${audioData.length}`);
      
      // Convert base64 to array buffer
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Try multiple formats to ensure broader compatibility
      const formats = [
        { type: 'audio/mpeg', ext: 'mp3' },
        { type: 'audio/mp4', ext: 'mp4' },
        { type: 'audio/ogg', ext: 'ogg' }
      ];
      
      // Create blobs for each format (but don't create URLs yet)
      const blobs = formats.map(format => {
        return {
          blob: new Blob([bytes], { type: format.type }),
          format: format.type,
          ext: format.ext,
          url: null // We'll create this on demand
        };
      });
      
      // Add to queue with metadata
      audioQueueRef.current.push({
        blobs: blobs,
        id: chunkId,
        timestamp: Date.now(),
        attemptedFormats: []
      });
      
      debugLog(`Added chunk ${chunkId} to queue. Queue length: ${audioQueueRef.current.length}`);
      
      // If this is the first audio chunk received during processing,
      // update the UI to indicate we're now ready for playback
      if (isProcessing && audioQueueRef.current.length === 1) {
        debugLog('First audio chunk received, ready for playback');
        setWaitingForPlayback(true);
        setIsProcessing(false);
      }
      
      // Reset the error counter when we successfully add a chunk
      if (typeof window.audioErrorCount === 'undefined') {
        window.audioErrorCount = 0;
      } else {
        window.audioErrorCount = 0;
      }
      
      // Start playback if not already playing
      if (!isPlayingRef.current && audioQueueRef.current.length > 0) {
        debugLog('Starting playback from handleAudioChunk');
        isPlayingRef.current = true;
        setIsPlaying(true);
        
        // Ensure we have an audio element with user interaction context
        ensureAudioElement();
        
        // Start playing
        playNextAudio();
      }
    } catch (error) {
      console.error('Error handling audio chunk:', error);
      setError(`Error processing audio: ${error.message}`);
    }
  };

  // Ensure we have a valid audio element (preserving user interaction)
  const ensureAudioElement = () => {
    if (!audioElementRef.current) {
      debugLog('Creating audio element for playback');
      createAudioElement();
    }
    return audioElementRef.current;
  };

  // Play the next audio in the queue
  const playNextAudio = () => {
    // Check if we're already in cleanup mode to prevent infinite loops
    if (isCleaningUpRef.current) {
      debugLog('Avoiding playback during cleanup');
      return;
    }
    
    // Ensure we have a valid audio element
    const audio = ensureAudioElement();
    if (!audio) {
      debugLog('Failed to create audio element, retrying in 50ms');
      setTimeout(() => playNextAudio(), 50);
      return;
    }
    
    // Clean up any existing source
    if (audio.src) {
      try {
        audio.pause();
        const oldSrc = audio.src;
        audio.src = '';
        audio.removeAttribute('src');
        audio.load();
        try {
          URL.revokeObjectURL(oldSrc);
        } catch (e) {
          // Ignore revoking errors
        }
      } catch (e) {
        debugLog('Error cleaning up previous source:', e);
      }
    }
    
    // Give browser a moment to release resources from previous audio playback
    // This is critical to prevent the alternating chunk issue
    setTimeout(() => {
      // Get the next audio from the queue
      if (audioQueueRef.current.length === 0) {
        debugLog('No audio in queue to play');
        isPlayingRef.current = false;
        setIsPlaying(false);
        return;
      }
      
      // Get the next chunk but don't remove it from the queue yet
      // We'll only remove it once we've successfully played it
      const nextChunk = audioQueueRef.current[0];
      if (!nextChunk || !nextChunk.blobs || nextChunk.blobs.length === 0) {
        debugLog('Invalid audio chunk in queue, removing and trying next', nextChunk);
        audioQueueRef.current.shift(); // Remove this invalid chunk
        setTimeout(() => playNextAudio(), 50);
        return;
      }
      
      const chunkId = nextChunk.id || new Date().getTime();
      audio.setAttribute('data-chunk-id', String(chunkId));
      
      // If we've tried all formats for this chunk and none worked, skip it
      if (nextChunk.attemptedFormats && 
          nextChunk.attemptedFormats.length >= nextChunk.blobs.length) {
        debugLog(`[Chunk ${chunkId}] All formats tried and failed, skipping chunk`);
        
        // Clean up and remove from queue
        nextChunk.blobs.forEach(b => {
          if (b.url) {
            try {
              URL.revokeObjectURL(b.url);
            } catch (e) {
              // Ignore errors
            }
          }
        });
        
        audioQueueRef.current.shift(); // Remove from queue
        
        // Try the next chunk with a longer delay
        setTimeout(() => playNextAudio(), 300);
        return;
      }
      
      // Find a format we haven't tried yet
      let formatToTry = null;
      for (const blob of nextChunk.blobs) {
        if (!nextChunk.attemptedFormats.includes(blob.format)) {
          formatToTry = blob;
          break;
        }
      }
      
      if (!formatToTry) {
        debugLog(`[Chunk ${chunkId}] No more formats to try, this shouldn't happen`);
        audioQueueRef.current.shift(); // Remove from queue
        setTimeout(() => playNextAudio(), 300);
        return;
      }
      
      // Mark this format as attempted
      nextChunk.attemptedFormats.push(formatToTry.format);
      
      debugLog(`[Chunk ${chunkId}] Trying format: ${formatToTry.format} (attempt ${nextChunk.attemptedFormats.length}/${nextChunk.blobs.length})`);
      
      // Create URL if not already created
      if (!formatToTry.url) {
        formatToTry.url = URL.createObjectURL(formatToTry.blob);
      }
      
      // Set up error handler for this attempt
      const originalErrorHandler = audio.onerror;
      
      audio.onerror = (e) => {
        const error = e.target.error;
        let errorMessage = 'Unknown error';
        
        // Decode error type
        if (error) {
          switch(error.code) {
            case 1:
              errorMessage = 'MEDIA_ERR_ABORTED: Fetching process aborted by user';
              break;
            case 2:
              errorMessage = 'MEDIA_ERR_NETWORK: Network error while loading media';
              break;
            case 3:
              errorMessage = 'MEDIA_ERR_DECODE: Media decoding error';
              break;
            case 4:
              errorMessage = 'MEDIA_ERR_SRC_NOT_SUPPORTED: Media format not supported';
              break;
            default:
              errorMessage = `Unknown error code: ${error.code}`;
          }
        }
        
        debugLog(`[Chunk ${chunkId}] Format ${formatToTry.format} failed: ${errorMessage}`);
        
        // Restore original error handler
        audio.onerror = originalErrorHandler;
        
        // Reset the audio element state to release resources
        audio.pause();
        
        if (audio.src) {
          try {
            const oldSrc = audio.src;
            audio.src = '';
            audio.removeAttribute('src');
            audio.load();
            URL.revokeObjectURL(oldSrc);
          } catch (e) {
            // Ignore errors
          }
        }
        
        // Check if we have more formats to try
        if (nextChunk.attemptedFormats.length < nextChunk.blobs.length) {
          debugLog(`[Chunk ${chunkId}] Trying next format...`);
          
          // Try the next format with a significant delay to allow browser to clear resources
          setTimeout(() => playNextAudio(), 300);
        } else {
          debugLog(`[Chunk ${chunkId}] All formats failed, skipping chunk`);
          // Remove from queue since we've tried all formats
          audioQueueRef.current.shift();
          
          // Try the next chunk with a longer delay to clear resources
          if (audioQueueRef.current.length > 0) {
            setTimeout(() => playNextAudio(), 400);
          } else {
            debugLog(`[Chunk ${chunkId}] No more chunks in queue`);
            if (processingCompleteRef.current) {
              handlePlaybackComplete();
            } else {
              isPlayingRef.current = false;
              setIsPlaying(false);
            }
          }
        }
      };
      
      // Set up success handlers
      const originalEndedHandler = audio.onended;
      
      audio.onended = () => {
        debugLog(`[Chunk ${chunkId}] Format ${formatToTry.format} played successfully`);
        
        // Restore original handlers
        audio.onended = originalEndedHandler;
        audio.onerror = originalErrorHandler;
        
        // Clean up this chunk
        nextChunk.blobs.forEach(b => {
          if (b.url) {
            try {
              URL.revokeObjectURL(b.url);
            } catch (e) {
              // Ignore errors
            }
          }
        });
        
        // Reset the audio element to fully release resources
        audio.pause();
        
        if (audio.src) {
          try {
            const oldSrc = audio.src;
            audio.src = '';
            audio.removeAttribute('src');
            audio.load();
            URL.revokeObjectURL(oldSrc);
          } catch (e) {
            // Ignore errors
          }
        }
        
        // Remove from queue since it played successfully
        audioQueueRef.current.shift();
        
        // Play next chunk if available with a delay to let browser release resources
        if (audioQueueRef.current.length > 0) {
          debugLog(`[Chunk ${chunkId}] Playing next chunk. ${audioQueueRef.current.length} chunks left`);
          setTimeout(() => playNextAudio(), 400); // Increased delay to allow resource release
        } else {
          debugLog(`[Chunk ${chunkId}] No more chunks in queue`);
          if (processingCompleteRef.current) {
            handlePlaybackComplete();
          } else {
            isPlayingRef.current = false;
            setIsPlaying(false);
          }
        }
      };
      
      // Set up play tracking
      const originalPlayHandler = audio.onplay;
      audio.onplay = () => {
        debugLog(`[Chunk ${chunkId}] Format ${formatToTry.format} playback started`);
        isPlayingRef.current = true;
        setIsPlaying(true);
        
        // Restore original handler
        audio.onplay = originalPlayHandler;
      };
      
      // Set a timeout to detect if the audio is stuck loading
      let loadTimeout = setTimeout(() => {
        if (audio.readyState < 3) { // HAVE_FUTURE_DATA = 3
          debugLog(`[Chunk ${chunkId}] Format ${formatToTry.format} load timed out`);
          
          // Reset the audio element to release resources
          try {
            audio.pause();
            if (audio.src) {
              const oldSrc = audio.src;
              audio.src = '';
              audio.removeAttribute('src');
              audio.load();
              URL.revokeObjectURL(oldSrc);
            }
          } catch (e) {
            // Ignore errors
          }
          
          // Trigger the error handler to try the next format
          if (audio.onerror) {
            const fakeError = new ErrorEvent('error', { 
              message: 'Load timeout',
              error: new Error('Load timeout') 
            });
            audio.dispatchEvent(fakeError);
          }
        }
      }, 3000);
      
      // Set up canplaythrough to clear the timeout
      const originalCanPlayHandler = audio.oncanplaythrough;
      audio.oncanplaythrough = () => {
        debugLog(`[Chunk ${chunkId}] Format ${formatToTry.format} can play through`);
        clearTimeout(loadTimeout);
        
        // Restore original handler
        audio.oncanplaythrough = originalCanPlayHandler;
      };
      
      try {
        // Completely reset before setting up the new source
        audio.pause();
        audio.currentTime = 0;
        
        // Set up the audio element with the new source
        audio.src = formatToTry.url;
        
        // Set to preload everything immediately - critical for mobile
        audio.preload = 'auto';
        
        // Force load - important for mobile browsers
        audio.load();
        
        // For mobile browsers, set volume to 0 and play a tiny bit to "prime" the audio
        // This helps avoid the initial audio clipping on mobile devices
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
          debugLog(`[Chunk ${chunkId}] Mobile device detected, applying special handling`);
          
          // Create a promise to track when we can safely play the full audio
          const prepareForPlayback = new Promise((resolve) => {
            // Listen for the loadedmetadata event before proceeding
            const handleLoadedMetadata = () => {
              debugLog(`[Chunk ${chunkId}] Metadata loaded, priming audio playback`);
              audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
              
              // Store the original volume
              const originalVolume = audio.volume;
              
              // Set volume to 0 to silently prime the audio
              audio.volume = 0;
              
              // Set a small currentTime offset to avoid initial clipping (10-20ms)
              try {
                // Calculate a small offset - don't go over duration
                if (audio.duration && audio.duration > 0.1) {
                  // Use a small offset to avoid clipping but not lose content
                  audio.currentTime = 0.02; // 20ms offset
                  debugLog(`[Chunk ${chunkId}] Applied 20ms offset to avoid clipping`);
                }
              } catch (e) {
                debugLog(`[Chunk ${chunkId}] Couldn't set currentTime: ${e.message}`);
              }
              
              // Prime the audio system with a quick play/pause
              const primePromise = audio.play().then(() => {
                // Immediately pause after a tiny playback
                setTimeout(() => {
                  audio.pause();
                  
                  // Reset position to beginning and restore volume
                  audio.currentTime = 0;
                  audio.volume = originalVolume;
                  
                  debugLog(`[Chunk ${chunkId}] Audio primed and ready for full playback`);
                  resolve();
                }, 10);
              }).catch(error => {
                debugLog(`[Chunk ${chunkId}] Priming failed, falling back: ${error.message}`);
                // If priming fails, just proceed anyway
                audio.volume = originalVolume;
                resolve();
              });
            };
            
            // Wait for metadata to load before attempting to prime
            audio.addEventListener('loadedmetadata', handleLoadedMetadata);
            
            // If metadata doesn't load within a reasonable time, proceed anyway
            setTimeout(() => {
              if (audio.readyState === 0) {
                debugLog(`[Chunk ${chunkId}] Metadata load timeout, proceeding anyway`);
                audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                resolve();
              }
            }, 1000);
          });
          
          // Wait for priming before normal playback
          prepareForPlayback.then(() => {
            // Now attempt the normal playback with small delay
            setTimeout(() => {
              try {
                const playPromise = audio.play();
                if (playPromise) {
                  playPromise.catch(error => {
                    debugLog(`[Chunk ${chunkId}] Play error after priming: ${error.name}`);
                    
                    // If autoplay was prevented, we need user interaction
                    if (error.name === 'NotAllowedError') {
                      debugLog(`[Chunk ${chunkId}] Autoplay prevented, needs user interaction`);
                      setWaitingForPlayback(true);
                      isPlayingRef.current = false;
                      setIsPlaying(false);
                    } else {
                      // Reset audio element to release resources
                      try {
                        audio.pause();
                        if (audio.src) {
                          const oldSrc = audio.src;
                          audio.src = '';
                          audio.removeAttribute('src');
                          audio.load();
                          URL.revokeObjectURL(oldSrc);
                        }
                      } catch (e) {
                        // Ignore errors
                      }
                      
                      // For other errors, try the next format
                      if (audio.onerror) {
                        const fakeError = new ErrorEvent('error', { 
                          message: error.message,
                          error: error 
                        });
                        audio.dispatchEvent(fakeError);
                      }
                    }
                  });
                }
              } catch (error) {
                debugLog(`[Chunk ${chunkId}] Error starting playback after priming: ${error}`);
                
                // Reset audio element to release resources
                try {
                  audio.pause();
                  if (audio.src) {
                    const oldSrc = audio.src;
                    audio.src = '';
                    audio.removeAttribute('src');
                    audio.load();
                    URL.revokeObjectURL(oldSrc);
                  }
                } catch (e) {
                  // Ignore errors
                }
                
                // Try next format
                if (audio.onerror) {
                  const fakeError = new ErrorEvent('error', { 
                    message: error.message,
                    error: error 
                  });
                  audio.dispatchEvent(fakeError);
                }
              }
            }, 100);
          });
        } else {
          // Desktop browser - use normal playback
          // Attempt to play with a small delay to let browser prepare
          setTimeout(() => {
            try {
              const playPromise = audio.play();
              if (playPromise) {
                playPromise.catch(error => {
                  debugLog(`[Chunk ${chunkId}] Play error: ${error.name}`);
                  
                  // If autoplay was prevented, we need user interaction
                  if (error.name === 'NotAllowedError') {
                    debugLog(`[Chunk ${chunkId}] Autoplay prevented, needs user interaction`);
                    setWaitingForPlayback(true);
                    isPlayingRef.current = false;
                    setIsPlaying(false);
                  } else {
                    // Reset audio element to release resources
                    try {
                      audio.pause();
                      if (audio.src) {
                        const oldSrc = audio.src;
                        audio.src = '';
                        audio.removeAttribute('src');
                        audio.load();
                        URL.revokeObjectURL(oldSrc);
                      }
                    } catch (e) {
                      // Ignore errors
                    }
                    
                    // For other errors, try the next format
                    if (audio.onerror) {
                      const fakeError = new ErrorEvent('error', { 
                        message: error.message,
                        error: error 
                      });
                      audio.dispatchEvent(fakeError);
                    }
                  }
                });
              }
            } catch (error) {
              debugLog(`[Chunk ${chunkId}] Error starting playback: ${error}`);
              
              // Reset audio element to release resources
              try {
                audio.pause();
                if (audio.src) {
                  const oldSrc = audio.src;
                  audio.src = '';
                  audio.removeAttribute('src');
                  audio.load();
                  URL.revokeObjectURL(oldSrc);
                }
              } catch (e) {
                // Ignore errors
              }
              
              // Try next format
              if (audio.onerror) {
                const fakeError = new ErrorEvent('error', { 
                  message: error.message,
                  error: error 
                });
                audio.dispatchEvent(fakeError);
              }
            }
          }, 100);
        }
      } catch (error) {
        debugLog(`[Chunk ${chunkId}] Setup error: ${error}`);
        
        // Reset audio element to release resources
        try {
          audio.pause();
          if (audio.src) {
            const oldSrc = audio.src;
            audio.src = '';
            audio.removeAttribute('src');
            audio.load();
            URL.revokeObjectURL(oldSrc);
          }
        } catch (e) {
          // Ignore errors
        }
        
        // Try next format
        if (audio.onerror) {
          const fakeError = new ErrorEvent('error', { 
            message: error.message,
            error: error 
          });
          audio.dispatchEvent(fakeError);
        }
      }
    }, 200); // Add delay before processing next chunk to allow browser to release resources
  };

  // Initialize connection on mount
  useEffect(() => {
    // Check for browser support
    if (!window.WebSocket) {
      setError('Your browser does not support WebSockets, which are required for this feature.');
      return;
    }

    if (!window.MediaRecorder) {
      setError('Your browser does not support audio recording, which is required for this feature.');
      return;
    }

    // Setup WebSocket
    setupWebSocket();

    // Initialize audio context (defer actual creation until user interaction)
    initAudioContext();

    // Event listeners for online/offline status
    const handleOnline = () => {
      debugLog('Network connection restored');
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        setupWebSocket();
      }
    };

    const handleOffline = () => {
      debugLog('Network connection lost');
      setError('Network connection lost. Please check your internet connection.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clean up on unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (socketRef.current) {
        socketRef.current.close();
      }

      stopRecording(false);
      cleanupAudio();

      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Intentionally empty dependency array for component mount/unmount only

  // Initialize audio context (called on mount and on first user interaction)
  const initAudioContext = async () => {
    try {
      if (!audioContextRef.current) {
        debugLog('Creating new AudioContext');
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (audioContextRef.current.state === 'suspended') {
        debugLog('Resuming suspended AudioContext');
        await audioContextRef.current.resume();
      }

      return audioContextRef.current;
    } catch (error) {
      debugLog('Error initializing AudioContext:', error);
      setError(`Audio initialization error: ${error.message}`);
      return null;
    }
  };

  // Start recording from microphone
  const startRecording = async () => {
    if (!isConnected) {
      setError('Not connected to server. Please try again.');
      return;
    }

    try {
      // Clear any previous recording/playback state
      cleanupAudio();
      setTranscription('');
      setAiResponse('');
      setError(null);

      // Get user media (microphone)
      debugLog('Requesting microphone access');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Ensure audio context is initialized
      await initAudioContext();

      // Create MediaRecorder
      const mimeType = getSupportedMimeType();
      debugLog(`Using MIME type: ${mimeType}`);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current = mediaRecorder;

      // Set up event handlers for recording
      mediaRecorder.ondataavailable = handleDataAvailable;
      mediaRecorder.onstart = () => {
        debugLog('MediaRecorder started');
        recordingStartTimeRef.current = Date.now();
        setIsRecording(true);
        
        // Send start_stream message to server
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          debugLog('Sending start_stream message to server');
          socketRef.current.send(JSON.stringify({
            type: 'start_stream',
            session_id: sessionId || null
          }));
        }
      };
      
      mediaRecorder.onstop = () => {
        debugLog('MediaRecorder stopped');
        setIsRecording(false);
      };
      
      mediaRecorder.onerror = (event) => {
        debugLog('MediaRecorder error:', event);
        setError(`Recording error: ${event.error.message || 'Unknown error'}`);
        stopRecording(false);
      };

      // Start recording
      mediaRecorder.start(250); // Collect data every 250ms
      
      // Create an audio meter for visualization
      setupAudioMeter(stream);

    } catch (error) {
      debugLog('Error starting recording:', error);
      setError(`Could not start recording: ${error.message}`);
    }
  };

  // Handle recorded audio data
  const handleDataAvailable = (event) => {
    if (event.data.size > 0 && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      debugLog(`Audio data available: ${event.data.size} bytes`);
      
      // Convert the blob to base64
      const reader = new FileReader();
      reader.readAsArrayBuffer(event.data);
      
      reader.onloadend = () => {
        try {
          const base64Data = arrayBufferToBase64(reader.result);
          
          // Send to server
          socketRef.current.send(JSON.stringify({
            type: 'audio_data',
            audio: base64Data,
            format: event.data.type || mediaRecorderRef.current?.mimeType || 'audio/webm',
            timestamp: new Date().toISOString()
          }));
          
          debugLog('Audio data sent to server');
        } catch (error) {
          debugLog('Error sending audio data:', error);
        }
      };
      
      reader.onerror = (error) => {
        debugLog('Error reading audio data:', error);
      };
    } else {
      if (event.data.size === 0) {
        debugLog('No audio data available (empty chunk)');
      } else if (!socketRef.current) {
        debugLog('WebSocket not initialized, cannot send audio data');
      } else if (socketRef.current.readyState !== WebSocket.OPEN) {
        debugLog(`WebSocket in ${getWebSocketStateString(socketRef.current.readyState)} state, cannot send audio data`);
      }
    }
  };

  // Get supported MIME type for recording
  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return '';
  };

  // Stop recording
  const stopRecording = (sendEndStream = true) => {
    // Stop MediaRecorder if it exists and is recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        debugLog('MediaRecorder stopped');
      } catch (error) {
        debugLog('Error stopping MediaRecorder:', error);
      }
    }

    // Stop all tracks in the stream
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
        debugLog('Audio tracks stopped');
      } catch (error) {
        debugLog('Error stopping audio tracks:', error);
      }
      streamRef.current = null;
    }

    // Send end_stream message if requested
    if (sendEndStream && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      debugLog('Sending end_stream message');
      try {
        socketRef.current.send(JSON.stringify({
          type: 'end_stream',
          session_id: sessionId || null,
          timestamp: new Date().toISOString()
        }));
        
        // Update UI to show processing state
        setIsProcessing(true);
        debugLog('Entered processing state');
      } catch (error) {
        debugLog('Error sending end_stream message:', error);
        setError('Failed to complete recording. Please try again.');
      }
    }

    // Reset recording state
    setIsRecording(false);
  };

  // Handle manual playback start (user clicked play button)
  const startManualPlayback = async () => {
    try {
      debugLog('User initiated playback');
      
      // Mark that we've had user interaction
      userInteractionRef.current = true;
      
      // Make sure audio context is running
      await initAudioContext();
      
      // Reset waiting state
      setWaitingForPlayback(false);
      
      // Start playback
      playNextAudio();
    } catch (error) {
      debugLog('Error starting manual playback:', error);
      setError(`Could not start playback: ${error.message}`);
    }
  };

  // Create audio element with event handlers
  const createAudioElement = () => {
    // Clean up any existing audio element
    if (audioElementRef.current) {
      // Remove old listeners to prevent memory leaks
      const oldAudio = audioElementRef.current;
      oldAudio.onended = null;
      oldAudio.onplay = null;
      oldAudio.onerror = null;
      oldAudio.onpause = null;
      oldAudio.oncanplaythrough = null;
      oldAudio.onwaiting = null;
      
      // Release any resources
      if (oldAudio.src) {
        try {
          URL.revokeObjectURL(oldAudio.src);
        } catch (e) {
          // Ignore errors
        }
        oldAudio.src = '';
      }
    }
    
    // Create new audio element
    const audio = new Audio();
    
    // Add property to track the current chunk
    audio.setAttribute('data-chunk-id', 'initial');
    
    // Mobile optimization settings
    audio.preload = 'auto';
    audio.controls = false;  // Don't show controls
    
    // This helps on iOS - allows inline playback without requiring fullscreen
    audio.playsInline = true;
    audio.setAttribute('playsinline', 'true');
    
    // This helps with iOS Web Audio API
    audio.crossOrigin = 'anonymous';
    
    // Prevent stalled playback by setting an error detection threshold
    audio.errorThreshold = 0;
    
    // Set up event handlers
    audio.oncanplaythrough = () => {
      const chunkId = audio.getAttribute('data-chunk-id') || 'unknown';
      debugLog(`[Chunk ${chunkId}] Audio can play through without buffering`);
    };
    
    audio.onwaiting = () => {
      const chunkId = audio.getAttribute('data-chunk-id') || 'unknown';
      debugLog(`[Chunk ${chunkId}] Audio is waiting for more data`);
    };
    
    audio.onplay = () => {
      const chunkId = audio.getAttribute('data-chunk-id') || 'unknown';
      debugLog(`[Chunk ${chunkId}] Audio playback started`);
      isPlayingRef.current = true;
      setIsPlaying(true);
    };
    
    audio.onended = () => {
      const chunkId = audio.getAttribute('data-chunk-id') || 'unknown';
      debugLog(`[Chunk ${chunkId}] Audio ended naturally`);
      
      // Clear the current audio source to release memory
      if (audio.src) {
        try {
          const currentSrc = audio.src;
          audio.src = '';
          URL.revokeObjectURL(currentSrc);
        } catch (e) {
          debugLog(`[Chunk ${chunkId}] Error revoking URL:`, e);
        }
      }
      
      // Continue to next chunk if available - with a longer delay for reliability
      if (audioQueueRef.current.length > 0) {
        debugLog(`[Chunk ${chunkId}] Playing next chunk. ${audioQueueRef.current.length} chunks left`);
        
        // Use a longer delay for more reliable playback of subsequent chunks
        // This gives the browser more time to release resources
        setTimeout(() => playNextAudio(), 200);
      } else {
        debugLog(`[Chunk ${chunkId}] No more chunks in queue`);
        
        // Check if we're done processing
        if (processingCompleteRef.current) {
          handlePlaybackComplete();
        } else {
          // Still waiting for more chunks
          isPlayingRef.current = false;
          setIsPlaying(false);
        }
      }
    };
    
    audio.onerror = (e) => {
      const error = e.target.error;
      const chunkId = audio.getAttribute('data-chunk-id') || 'unknown';
      let errorMessage = 'Unknown error';
      
      // Decode error type
      if (error) {
        switch(error.code) {
          case 1:
            errorMessage = 'MEDIA_ERR_ABORTED: Fetching process aborted by user';
            break;
          case 2:
            errorMessage = 'MEDIA_ERR_NETWORK: Network error while loading media';
            break;
          case 3:
            errorMessage = 'MEDIA_ERR_DECODE: Media decoding error';
            break;
          case 4:
            errorMessage = 'MEDIA_ERR_SRC_NOT_SUPPORTED: Media format not supported';
            break;
          default:
            errorMessage = `Unknown error code: ${error.code}`;
        }
      }
      
      debugLog(`[Chunk ${chunkId}] Audio playback error: ${errorMessage}`);
      
      // Increment the format error counter if it's a format error
      if (error && error.code === 4) {
        if (typeof window.audioErrorCount === 'undefined') {
          window.audioErrorCount = 1;
        } else {
          window.audioErrorCount++;
        }
        
        debugLog(`[Chunk ${chunkId}] Format error count: ${window.audioErrorCount}`);
        
        // If we've had too many format errors, show an error and stop
        if (window.audioErrorCount > 3) {
          debugLog(`[Chunk ${chunkId}] Too many format errors, stopping playback`);
          window.audioErrorCount = 0; // Reset for next time
          
          // Clean up all audio
          cleanupAudio();
          setError("Your browser doesn't support this audio format. Please try a different browser.");
          return;
        }
      }
      
      // Check if we're already in cleanup to prevent infinite loops
      if (isCleaningUpRef.current) {
        debugLog(`[Chunk ${chunkId}] Avoiding recursive error handling during cleanup`);
        return;
      }
      
      // Try to continue with next chunk
      if (audioQueueRef.current.length > 0) {
        debugLog(`[Chunk ${chunkId}] Error playing audio, trying next chunk`);
        setTimeout(() => playNextAudio(), 50);
      } else {
        debugLog(`[Chunk ${chunkId}] No more chunks to play after error`);
        handlePlaybackComplete();
      }
    };
    
    // Connect audio to analyzer for visualization (if needed)
    try {
      connectAudioToAnalyzer(audio);
    } catch (error) {
      debugLog('Warning: Could not connect audio to analyzer (may be normal on iOS):', error);
      // This is expected to fail on iOS - we'll handle visualization differently
    }
    
    // Save reference
    audioElementRef.current = audio;
    return audio;
  };

  // Connect audio to analyzer for visualization
  const connectAudioToAnalyzer = (audio) => {
    if (!audioContextRef.current || !audio) return;
    
    try {
      // Create an analyzer node if it doesn't exist
      if (!audioAnalyserRef.current) {
        audioAnalyserRef.current = audioContextRef.current.createAnalyser();
        audioAnalyserRef.current.fftSize = 256;
      }
      
      // Create a media element source from the audio element
      const source = audioContextRef.current.createMediaElementSource(audio);
      
      // Connect source -> analyzer -> destination
      source.connect(audioAnalyserRef.current);
      audioAnalyserRef.current.connect(audioContextRef.current.destination);
      
      debugLog('Audio connected to analyzer for visualization');
    } catch (error) {
      // This might fail if the audio is already connected
      debugLog('Error connecting audio to analyzer:', error);
    }
  };

  // Set up audio meter for visualization during recording
  const setupAudioMeter = (stream) => {
    if (!audioContextRef.current) return;
    
    try {
      // Create source from microphone stream
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create analyzer node
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      audioAnalyserRef.current = analyser;
      
      // Connect source to analyzer
      source.connect(analyser);
      
      // Set up interval to measure audio level
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (!audioAnalyserRef.current) return;
        
        // Get frequency data
        audioAnalyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Scale to 0-100 for visualization
        const scaledLevel = Math.min(100, Math.round((average / 255) * 100));
        setCurrentAudioLevel(scaledLevel);
      };
      
      const intervalId = setInterval(updateAudioLevel, 100);
      
      // Store interval ID for cleanup
      return () => clearInterval(intervalId);
    } catch (error) {
      debugLog('Error setting up audio meter:', error);
    }
  };

  // Clean up playback
  const handlePlaybackComplete = () => {
    debugLog('Playback complete, cleaning up');
    
    // Set a guard flag to prevent recursive calls
    if (isCleaningUpRef.current) {
      debugLog('Already cleaning up, preventing recursive call');
      return;
    }
    
    isCleaningUpRef.current = true;
    
    // Reset state flags
    isPlayingRef.current = false;
    processingCompleteRef.current = false;
    setIsPlaying(false);
    
    // Reset error counter
    window.audioErrorCount = 0;
    
    // Clean up audio element
    if (audioElementRef.current) {
      try {
        // Pause playback
        audioElementRef.current.pause();
        
        // Clear the source
        if (audioElementRef.current.src) {
          const currentSrc = audioElementRef.current.src;
          audioElementRef.current.src = '';
          try {
            URL.revokeObjectURL(currentSrc);
          } catch (e) {
            // Ignore errors when revoking URLs
          }
        }
      } catch (error) {
        debugLog('Error cleaning up audio element:', error);
      }
    }
    
    // Clear the guard flag
    setTimeout(() => {
      isCleaningUpRef.current = false;
    }, 100);
  };

  // Special function to ensure iOS Safari will allow audio playback
  // This should be called during user interaction (click/touch)
  const ensureAudioContext = () => {
    debugLog('Ensuring audio context is ready');
    
    // Mark that we've had user interaction
    userInteractionRef.current = true;
    
    // For iOS Safari: create and start audio context during user gesture
    try {
      // Create a temporary audio context if needed
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext && (!audioContextRef.current || audioContextRef.current.state !== 'running')) {
        const tempContext = new AudioContext();
        
        // iOS needs a sound to be played during user interaction
        const oscillator = tempContext.createOscillator();
        const gainNode = tempContext.createGain();
        
        // Set the volume to 0 so it's silent
        gainNode.gain.value = 0;
        
        // Connect and start a silent oscillator
        oscillator.connect(gainNode);
        gainNode.connect(tempContext.destination);
        oscillator.start(0);
        oscillator.stop(0.001); // Very short duration
        
        // Store the context
        audioContextRef.current = tempContext;
        
        debugLog('Audio context initialized during user interaction');
      }
      
      // Create audio element during user interaction
      if (!audioElementRef.current) {
        debugLog('Creating audio element during user interaction');
        createAudioElement();
      }
    } catch (error) {
      debugLog('Error initializing audio context:', error);
    }
  };

  // Handle record button click - start or stop recording
  const handleRecordClick = () => {
    // Ensure audio context (for iOS Safari)
    ensureAudioContext();
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  // Handle play response click
  const handlePlayResponseClick = () => {
    // Ensure audio context (for iOS Safari)
    ensureAudioContext();
    
    if (audioQueueRef.current.length > 0) {
      debugLog('Manual play response clicked');
      playNextAudio();
    } else {
      debugLog('No audio to play');
    }
  };

  // Clean up all audio resources
  const cleanupAudio = () => {
    // Stop playback
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      
      if (audioElementRef.current.src) {
        URL.revokeObjectURL(audioElementRef.current.src);
        audioElementRef.current.src = '';
      }
    }
    
    // Clean up queue
    audioQueueRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        debugLog('Error revoking URL:', e);
      }
    });
    
    audioQueueRef.current = [];
    
    // Reset states
    isPlayingRef.current = false;
    processingCompleteRef.current = false;
    setIsPlaying(false);
    setIsProcessing(false);
    setWaitingForPlayback(false);
  };

  // Handle retry connection
  const handleRetryConnection = () => {
    setError(null);
    setupWebSocket();
  };

  // Handle send button click
  const handleSendClick = async () => {
    if (isRecording) {
      userInteractionRef.current = true;
      await initAudioContext();
      stopRecording(true);
    }
  };

  // Render component
  return (
    <div className="new-voice-chat-container">
      <Card className="new-voice-chat">
        <Card.Body>
          {/* Connection status */}
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected'}`}></span>
            <span className="status-text">
              {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>

          {/* Error messages */}
          {error && (
            <Alert 
              variant="danger" 
              className="error-message" 
              dismissible 
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Main content area */}
          <div className="main-content-container">
            {/* Visualization */}
            <div className={`visualization-container ${isRecording ? 'recording' : isPlaying ? 'playing' : ''}`}>
              <SimpleVoiceVisualizer
                isRecording={isRecording}
                isPlaying={isPlaying}
                audioAnalyserRef={audioAnalyserRef}
                currentAudioLevel={currentAudioLevel}
              />
            </div>

            {/* Controls area */}
            <div className="controls-area">
              {/* Show different controls based on state */}
              {!isRecording && !isProcessing && !isPlaying && !waitingForPlayback && (
                <div className="voice-controls">
                  <Button
                    className="record-button"
                    onClick={handleRecordClick}
                    disabled={!isConnected}
                  >
                    <Mic size={24} />
                  </Button>
                </div>
              )}

              {isRecording && (
                <div className="recording-controls">
                  <div className="recording-indicator">
                    <span className="pulse"></span>
                    Recording...
                  </div>
                  <div className="recording-buttons">
                    <Button
                      className="cancel-button"
                      onClick={() => stopRecording(false)}
                    >
                      <X size={20} />
                    </Button>
                    <Button
                      className="send-button"
                      onClick={handleSendClick}
                    >
                      <Send size={20} />
                    </Button>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="processing-indicator">
                  <Spinner animation="border" size="sm" />
                  <span>Processing...</span>
                </div>
              )}

              {waitingForPlayback && (
                <div className="playback-controls">
                  <Button
                    className="play-button"
                    onClick={handlePlayResponseClick}
                  >
                    <PlayCircle size={20} />
                    <span>Play Response</span>
                  </Button>
                </div>
              )}

              {isPlaying && (
                <div className="playing-indicator">
                  <span className="pulse"></span>
                  Playing...
                </div>
              )}

              {!isConnected && !isConnecting && (
                <div className="disconnected-controls">
                  <div className="connection-message">Disconnected from server</div>
                  <Button 
                    className="retry-button"
                    onClick={handleRetryConnection}
                  >
                    Retry Connection
                  </Button>
                </div>
              )}
            </div>

            {/* Transcription and AI response display */}
            {(transcription || aiResponse) && (
              <div className="messages-area">
                {transcription && (
                  <div className="transcription-container">
                    <div className={`transcription-text ${isRecording ? 'current' : 'final'}`}>
                      {transcription || (
                        <span className="transcription-empty">Waiting for speech...</span>
                      )}
                    </div>
                  </div>
                )}

                {aiResponse && (
                  <div className="ai-response-container">
                    <div className="ai-response-label">AI Response:</div>
                    <div className="ai-response-text">
                      {aiResponse || (
                        <span className="ai-response-empty">Waiting for response...</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default NewVoiceChat; 