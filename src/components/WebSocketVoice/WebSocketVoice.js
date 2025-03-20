import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Spinner, Alert, Form } from 'react-bootstrap';
import { Mic, Square, X, Pause, Play, Keyboard, Send, Settings } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './WebSocketVoice.css';

// DEBUG mode - set to true for verbose logging
const DEBUG = true;

// Debug log function
const debugLog = (...args) => {
  if (DEBUG) {
    console.log('[WebSocketVoice]', ...args);
  }
};

// Default setting for silence detection
const DEFAULT_AUTO_SEND_ENABLED = true;
const DEFAULT_SILENCE_THRESHOLD = 5000; // 5 seconds
const DEFAULT_SEND_DELAY = 500; // 500ms delay after manual send button press

// Get the API base URL from environment
const apiBaseURL = process.env.REACT_APP_API_BASE_URL || '';
debugLog('API Base URL:', apiBaseURL);

// Add this utility function for converting ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return window.btoa(binary);
};

// Helper function to convert WebSocket readyState to string
const getWebSocketStateString = (readyState) => {
  switch (readyState) {
    case WebSocket.CONNECTING:
      return 'CONNECTING';
    case WebSocket.OPEN:
      return 'OPEN';
    case WebSocket.CLOSING:
      return 'CLOSING';
    case WebSocket.CLOSED:
      return 'CLOSED';
    default:
      return 'UNKNOWN';
  }
};

const WebSocketVoice = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  // Browser compatibility check
  const [browserSupported, setBrowserSupported] = useState(true);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false); // Add ref for processing state
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isFinalTranscript, setIsFinalTranscript] = useState(false);
  const [microphoneAccessGranted, setMicrophoneAccessGranted] = useState(false);
  
  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoplayFailed, setAutoplayFailed] = useState(false);
  
  // AI response state
  const [aiResponse, setAiResponse] = useState('');
  
  // WebSocket and MediaRecorder refs
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastAudioActivityRef = useRef(Date.now());
  const wsUrl = useRef(null);
  const isCleanupRef = useRef(false);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const isRecordingRef = useRef(false);
  
  // Audio processing refs
  const audioBuffersRef = useRef({});
  const pendingChunksRef = useRef([]);
  const allAudioChunksUrlsRef = useRef([]);
  const isPlayingRef = useRef(false);
  const userInteractionContextRef = useRef(null);
  const autoplayFailedRef = useRef(false);
  const isPlaybackCompleteRef = useRef(false);
  const audioAnalyserRef = useRef(null);
  const audioDataRef = useRef(null);
  
  // Silence detection constants
  const MAX_RECORDING_DURATION = 30000; // 30 seconds
  const silenceDetectionIntervalRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  
  // Add a chunk counter reference at the top of the component
  const chunkCounterRef = useRef(0);
  
  // Connection status
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine ? 'online' : 'offline');
  const [currentAudioLevel, setCurrentAudioLevel] = useState(0);
  
  // AutoSend feature states
  const [autoSendEnabled, setAutoSendEnabled] = useState(
    localStorage.getItem('autoSendEnabled') !== null 
      ? localStorage.getItem('autoSendEnabled') === 'true'
      : DEFAULT_AUTO_SEND_ENABLED
  );
  const [silenceThreshold, setSilenceThreshold] = useState(
    localStorage.getItem('silenceThreshold') !== null
      ? parseInt(localStorage.getItem('silenceThreshold'), 10)
      : DEFAULT_SILENCE_THRESHOLD
  );
  const [sendDelay, setSendDelay] = useState(
    localStorage.getItem('sendDelay') !== null
      ? parseInt(localStorage.getItem('sendDelay'), 10)
      : DEFAULT_SEND_DELAY
  );
  const [showSettings, setShowSettings] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const sendDelayTimeoutRef = useRef(null);

  
  // Check browser compatibility on initial load
  useEffect(() => {
    // Check if WebSocket is supported
    if (!window.WebSocket) {
      debugLog('WebSocket not supported in this browser');
      setBrowserSupported(false);
      setError('Your browser does not support WebSockets, which are required for this feature.');
      return;
    }
    
    // Check if MediaRecorder is supported
    if (!window.MediaRecorder) {
      debugLog('MediaRecorder not supported in this browser');
      setBrowserSupported(false);
      setError('Your browser does not support audio recording, which is required for this feature.');
      return;
    }
    
    setBrowserSupported(true);
  }, []);
  
  // Configure WebSocket connection
  const setupWebSocket = () => {
    try {
      // Close any existing connection
      if (socketRef.current) {
        debugLog('Closing existing WebSocket connection');
        socketRef.current.close();
      }
      
      // Set connecting state immediately
      setConnectionStatus('connecting');
      
      // Get the WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // Try to get the base URL from environment or current location
      let serverUrl;
      if (apiBaseURL && apiBaseURL !== '') {
        // Remove http:// or https:// and replace with ws:// or wss://
        serverUrl = apiBaseURL.replace(/^http(s?):\/\//, '');
        wsUrl.current = `${protocol}//${serverUrl}/ws/voice`;
      } else {
        // Fallback to current location if API base URL is not available
        const host = window.location.host;
        wsUrl.current = `${protocol}//${host}/ws/voice`;
      }
      
      // Add authentication token if available
      const authToken = localStorage.getItem('access_token');
      if (authToken) {
        debugLog('Adding authentication token to WebSocket URL');
        wsUrl.current = `${wsUrl.current}?token=${authToken}`;
      } else {
        debugLog('No authentication token found');
      }
      
      debugLog(`Connecting to WebSocket: ${wsUrl.current}`);
      
      const socket = new WebSocket(wsUrl.current);
      socketRef.current = socket;
      
      // Set up connection timeout
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          debugLog('WebSocket connection timeout');
          setError('Connection timeout. Could not connect to the server.');
          setConnectionStatus('disconnected');
          socket.close();
        }
      }, 10000); // 10 seconds timeout
      
      socket.onopen = () => {
        clearTimeout(connectionTimeout);
        debugLog('WebSocket connection established');
        setConnectionStatus('connected');
        setError(null);
      };
      
      socket.onmessage = handleWebSocketMessage;
      
      socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        debugLog(`WebSocket connection closed: ${event.code} ${event.reason}`);
        setConnectionStatus('disconnected');
        
        // Add more detailed debugging info for close events
        let closeReason = 'Connection closed';
        if (event.code === 1000) {
          closeReason = 'Normal closure';
        } else if (event.code === 1001) {
          closeReason = 'Endpoint going away';
        } else if (event.code === 1002) {
          closeReason = 'Protocol error';
        } else if (event.code === 1003) {
          closeReason = 'Unsupported data';
        } else if (event.code === 1005) {
          closeReason = 'No status received';
        } else if (event.code === 1006) {
          closeReason = 'Abnormal closure - connection lost';
        } else if (event.code === 1007) {
          closeReason = 'Invalid frame payload data';
        } else if (event.code === 1008) {
          closeReason = 'Policy violation';
        } else if (event.code === 1009) {
          closeReason = 'Message too big';
        } else if (event.code === 1010) {
          closeReason = 'Missing extension';
        } else if (event.code === 1011) {
          closeReason = 'Internal server error';
        } else if (event.code === 1012) {
          closeReason = 'Service restart';
        } else if (event.code === 1013) {
          closeReason = 'Try again later';
        } else if (event.code === 1014) {
          closeReason = 'Bad gateway';
        } else if (event.code === 1015) {
          closeReason = 'TLS handshake';
        }
        
        debugLog(`Close code ${event.code}: ${closeReason}`);
        
        // Only set an error message if it's an abnormal closure and not during cleanup
        if (event.code !== 1000 && !isCleanupRef.current) {
          setError(`WebSocket disconnected: ${closeReason}`);
        }
      };
      
      socket.onerror = (error) => {
        debugLog('WebSocket error:', error);
        setConnectionStatus('disconnected');
        setError('Failed to connect to server. Check your network connection and try again.');
      };
      
      return socket;
    } catch (error) {
      debugLog('Error setting up WebSocket:', error);
      setConnectionStatus('disconnected');
      setError(`WebSocket setup error: ${error.message}`);
      return null;
    }
  };
  
  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      const timestamp = new Date().toISOString();
      
      debugLog(`[RECEIVED ${timestamp}] Message type: ${message.type}`);
      
      switch (message.type) {
        case 'stream_started':
          debugLog('Server acknowledged stream start');
          if (isRecordingRef.current) { // Only update if still recording
            updateIsProcessing(true);
          }
          break;
          
        case 'transcript_update':
          debugLog(`Transcript update: "${message.transcript}"`);
          setTranscription(message.transcript);
          setIsFinalTranscript(message.is_final);
          break;
          
        case 'transcript_final':
          debugLog(`Final transcript: "${message.transcript}"`);
          setTranscription(message.transcript);
          setIsFinalTranscript(true);
          break;
          
        case 'audio_chunk':
          const audioLength = message.audio ? message.audio.length : 0;
          debugLog(`Received audio chunk from server: ${audioLength} chars, text: "${message.text || 'none'}"`);
          
          // If we're receiving a new audio chunk after processing was complete,
          // we need to reset our playback state for the new response
          if (!isProcessing && isPlaybackCompleteRef.current) {
            debugLog('Received new audio after previous playback completed, resetting playback state');
            pendingChunksRef.current = [];
            allAudioChunksUrlsRef.current = [];
            isPlayingRef.current = false;
            isPlaybackCompleteRef.current = false;
            setIsPlaying(false);
          }
          
          // Update AI's response text separately from user transcript
          if (message.text) {
            setAiResponse(prevResponse => prevResponse + " " + message.text);
            debugLog(`Updated AI response with: "${message.text}"`);
          }
          
          handleAudioChunk(message);
          break;
          
        case 'processing_complete':
          debugLog('Server signaled processing complete');
          
          // There may be a race condition where we receive processing_complete
          // after we've already stopped recording but before we've received any audio
          // Only reset processing state if we're not playing audio
          if (!isPlayingRef.current) {
            debugLog('No active playback, resetting processing state immediately');
            updateIsProcessing(false);
          } else {
            debugLog('Audio is currently playing, will reset processing state after playback');
            // We'll let handlePlaybackComplete reset the processing state when audio finishes
          }
          
          setIsRecording(false); // Ensure recording state is reset
          isRecordingRef.current = false; // Reset recording ref
          
          // If audio is done playing, clean up
          if (!isPlayingRef.current) {
            handlePlaybackComplete();
          }
          break;
          
        case 'error':
          debugLog(`Server error: ${message.message}`);
          setError(message.message);
          updateIsProcessing(false);
          setIsRecording(false);
          isRecordingRef.current = false;
          stopRecording(false); // Don't send another end_stream
          break;
          
        case 'cancelled':
          debugLog('Server acknowledged cancellation');
          updateIsProcessing(false);
          setIsRecording(false);
          isRecordingRef.current = false;
          break;
          
        default:
          debugLog('Unknown message type:', message.type);
      }
    } catch (error) {
      debugLog('Error parsing WebSocket message:', error);
    }
  };
  
  // Initialize the audio context
  const initializeAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };
  
  // Handle audio chunk from server
  const handleAudioChunk = async (message) => {
    try {
      // If this is the first audio chunk received during processing,
      // update the UI state to indicate we're now playing audio
      if (isProcessingRef.current && !isPlaying) {
        debugLog('First audio chunk received, transitioning from processing to playback');
      } else if (!isProcessingRef.current && !isPlaying) {
        // We're receiving audio but not in processing state, this could happen if we 
        // already received processing_complete before the first audio chunk
        debugLog('Receiving audio while not in processing state - likely processing_complete arrived early');
      }
      
      // Process audio data
      if (message.audio) {
        debugLog(`Processing audio data of length: ${message.audio.length}`);
        
        // Convert base64 to array buffer
        const binaryString = atob(message.audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        await queueAndPlayAudio(bytes.buffer);
      } else {
        debugLog('Received audio_chunk message without audio data');
      }
    } catch (error) {
      debugLog('Error handling audio chunk:', error);
      setError(`Error playing audio: ${error.message}`);
    }
  };
  
  // Play audio chunks as they arrive - ensuring sequential playback
  const queueAndPlayAudio = async (arrayBuffer) => {
    try {
      if (!audioContextRef.current) {
        await initializeAudioContext();
      }
      
      // Create audio blob with the correct MIME type
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' }); // Consistent MIME type for playback
      const audioUrl = URL.createObjectURL(audioBlob);
      
      debugLog(`Created audio blob URL: ${audioUrl}, size: ${arrayBuffer.byteLength} bytes`);
      
      // Store this URL in our complete list for potential replay
      allAudioChunksUrlsRef.current.push(audioUrl);
      
      // Ensure we have an audio element
      if (!audioBuffersRef.current.audio) {
        debugLog('Creating new Audio element for playback');
        const audio = new Audio();
        
        // Create a property to track safety timeouts
        audio.safetyTimeoutId = null;
        
        // Set up comprehensive event handlers for the audio element
        audio.onended = () => {
          debugLog('Audio playback ended naturally');
          // Clear any existing safety timeout
          if (audio.safetyTimeoutId) {
            clearTimeout(audio.safetyTimeoutId);
            audio.safetyTimeoutId = null;
          }
          handleNextChunk(audio);
        };
        
        audio.onpause = () => {
          debugLog('Audio playback paused');
        };
        
        audio.onplay = () => {
          debugLog('Audio playback started');
          
          // Clear any existing safety timeout first
          if (audio.safetyTimeoutId) {
            clearTimeout(audio.safetyTimeoutId);
            audio.safetyTimeoutId = null;
          }
          
          // Add safety timeout in case onended doesn't fire
          if (audio.duration && isFinite(audio.duration)) {
            const safetyTimeout = (audio.duration * 1000) + 1000; // Duration in ms + 1000ms buffer
            const currentSrc = audio.src; // Store the current source URL
            debugLog(`Setting safety timeout for ${safetyTimeout}ms based on audio duration ${audio.duration}s`);
            
            // Store the timeout ID
            audio.safetyTimeoutId = setTimeout(() => {
              // Only advance if this chunk is still playing (hasn't already advanced)
              // Check if the src is still the same to prevent premature advancement
              if (isPlayingRef.current && audio.src && audio.src === currentSrc) {
                debugLog('Safety timeout triggered - onended may not have fired');
                handleNextChunk(audio);
              } else {
                debugLog('Safety timeout ignored - audio src changed or playback already completed');
              }
              audio.safetyTimeoutId = null;
            }, safetyTimeout);
          } else {
            // If we can't determine duration, use a smarter fallback approach
            const currentSrc = audio.src; // Store the current source URL
            
            // Check if there's any audio data to estimate length from
            let estimatedTimeout = 6000; // Default to 6 seconds (longer than before)
            let fixedTimeoutId = null;
            
            // Try to get size information to estimate length
            try {
              const urlParts = currentSrc.split('/');
              const blobId = urlParts[urlParts.length - 1];
              const matchingUrl = allAudioChunksUrlsRef.current.find(url => url.includes(blobId));
              
              if (matchingUrl) {
                // We found the matching URL in our list, try to estimate size
                debugLog('Trying to estimate audio length from blob URL');
                
                // Set an escalating checking mechanism
                let checkCount = 0;
                const checkInterval = setInterval(() => {
                  checkCount++;
                  
                  // Check if the audio has started playing and has a duration now
                  if (audio.duration && isFinite(audio.duration)) {
                    clearInterval(checkInterval);
                    
                    // Also clear the fixed timeout since we now have a better estimate
                    if (fixedTimeoutId) {
                      clearTimeout(fixedTimeoutId);
                      fixedTimeoutId = null;
                    }
                    
                    // Clear any existing safety timeout
                    if (audio.safetyTimeoutId) {
                      clearTimeout(audio.safetyTimeoutId);
                      audio.safetyTimeoutId = null;
                    }
                    
                    const newTimeout = (audio.duration * 1000) + 1000;
                    debugLog(`Updated safety timeout to ${newTimeout}ms after detecting duration ${audio.duration}s`);
                    
                    // Set the new timeout and store its ID
                    audio.safetyTimeoutId = setTimeout(() => {
                      if (isPlayingRef.current && audio.src && audio.src === currentSrc) {
                        debugLog('Updated safety timeout triggered - onended may not have fired');
                        handleNextChunk(audio);
                      }
                      audio.safetyTimeoutId = null;
                    }, newTimeout);
                    return;
                  }
                  
                  // If we've checked several times and still no duration, estimate from current time
                  if (checkCount >= 3 && audio.currentTime > 0) {
                    clearInterval(checkInterval);
                    
                    // Also clear the fixed timeout since we now have a better estimate
                    if (fixedTimeoutId) {
                      clearTimeout(fixedTimeoutId);
                      fixedTimeoutId = null;
                    }
                    
                    // Clear any existing safety timeout
                    if (audio.safetyTimeoutId) {
                      clearTimeout(audio.safetyTimeoutId);
                      audio.safetyTimeoutId = null;
                    }
                    
                    // Estimate total length as at least 3x current progress, minimum 5s
                    const estimatedDuration = Math.max(audio.currentTime * 3, 5);
                    const newTimeout = (estimatedDuration * 1000);
                    debugLog(`Estimated safety timeout: ${newTimeout}ms based on currentTime ${audio.currentTime}s`);
                    
                    // Set the new timeout and store its ID
                    audio.safetyTimeoutId = setTimeout(() => {
                      if (isPlayingRef.current && audio.src && audio.src === currentSrc) {
                        debugLog('Estimated safety timeout triggered - onended may not have fired');
                        handleNextChunk(audio);
                      }
                      audio.safetyTimeoutId = null;
                    }, newTimeout);
                  }
                  
                  // Give up after 5 checks
                  if (checkCount >= 5) {
                    clearInterval(checkInterval);
                  }
                }, 500); // Check every 500ms
              }
            } catch (e) {
              debugLog('Error estimating audio length:', e);
            }
            
            debugLog(`Setting fixed safety timeout of ${estimatedTimeout}ms - cannot determine audio duration`);
            // Store the fixed timeout ID both locally and on the audio element
            fixedTimeoutId = setTimeout(() => {
              if (isPlayingRef.current && audio.src && audio.src === currentSrc) {
                debugLog('Fixed safety timeout triggered - advancing to next chunk');
                handleNextChunk(audio);
              } else {
                debugLog('Fixed safety timeout ignored - audio src changed or playback already completed');
              }
              if (audio.safetyTimeoutId === fixedTimeoutId) {
                audio.safetyTimeoutId = null;
              }
            }, estimatedTimeout);
            
            // Store the timeout ID
            audio.safetyTimeoutId = fixedTimeoutId;
          }
        };
        
        audio.onerror = (e) => {
          const error = e.target.error;
          debugLog(`Audio playback error: ${error ? error.code : 'unknown'}`);
          
          // Prevent infinite loops - don't try to handle next chunk on playback errors
          // if we're in the middle of cleanup or already finished
          if (!isProcessing && !isPlayingRef.current) {
            debugLog('Not handling next chunk due to error during inactive state');
            return;
          }
          
          if (audio.src) {
            try {
              URL.revokeObjectURL(audio.src);
            } catch (e) {
              debugLog('Error revoking URL:', e);
            }
          }
          
          // Only proceed to next chunk if we're still actively playing
          if (isPlayingRef.current) {
            handleNextChunk(audio);
          }
        };
        
        audioBuffersRef.current.audio = audio;
      }
      
      // Handle playing the next chunk from the queue
      const handleNextChunk = (audioElement) => {
        // Guard against infinite loops: ensure we're still in an active state
        if (!isPlayingRef.current && !isProcessing) {
          debugLog('Skipping handleNextChunk since playback is no longer active');
          return;
        }
        
        // Clear any safety timeout that might be active
        if (audioElement.safetyTimeoutId) {
          debugLog('Clearing active safety timeout as handleNextChunk was called');
          clearTimeout(audioElement.safetyTimeoutId);
          audioElement.safetyTimeoutId = null;
        }
        
        // Ensure the current audio is completely stopped before proceeding
        if (audioElement.currentTime > 0 && !audioElement.paused && !audioElement.ended) {
          debugLog('Previous audio still playing, pausing before handling next chunk');
          audioElement.pause();
          // Force currentTime to end to ensure it's considered complete
          if (audioElement.duration && isFinite(audioElement.duration)) {
            audioElement.currentTime = audioElement.duration;
          }
        }
        
        // Clean up the current URL
        if (audioElement.src) {
          try {
            URL.revokeObjectURL(audioElement.src);
            audioElement.removeAttribute('src'); // Clear source
            audioElement.load(); // Reset the audio element
          } catch (e) {
            debugLog('Error cleaning up audio source:', e);
          }
        }
        
        // Play next chunk if available
        if (pendingChunksRef.current.length > 0) {
          const nextChunkUrl = pendingChunksRef.current.shift();
          debugLog(`Playing next chunk in queue (${pendingChunksRef.current.length} remaining)`);
          
          audioElement.src = nextChunkUrl;
          audioElement.load(); // Important: reload after changing source
          
          // Add event listener to check audio metadata before playing
          const metadataCheckTimeout = setTimeout(() => {
            debugLog('Audio metadata load timed out - trying to play anyway');
            playNextAudio();
          }, 1000);
          
          const onMetadataLoaded = () => {
            clearTimeout(metadataCheckTimeout);
            debugLog(`Audio metadata loaded - duration: ${audioElement.duration}s, ready state: ${audioElement.readyState}`);
            playNextAudio();
          };
          
          // One-time event listener for metadata
          audioElement.addEventListener('loadedmetadata', onMetadataLoaded, { once: true });
          
          // Function to attempt playback
          const playNextAudio = () => {
            audioElement.removeEventListener('loadedmetadata', onMetadataLoaded);
            
            // Check if audio is already playing
            if (audioElement.currentTime > 0 && !audioElement.paused && !audioElement.ended) {
              debugLog('Another audio chunk is already playing - waiting before playing next');
              
              // Set a one-time event listener for when the current audio ends
              const waitForEnd = () => {
                debugLog('Previous audio finished, now playing next chunk');
                
                // Try playing again after the current one ends
                audioElement.play().catch(e => {
                  debugLog('Error playing next chunk after waiting:', e);
                  if (isPlayingRef.current) {
                    setTimeout(() => handleNextChunk(audioElement), 100);
                  }
                });
              };
              
              // Listen for the end of the current audio
              audioElement.addEventListener('ended', waitForEnd, { once: true });
              
              // Also set a safety timeout in case ended doesn't fire
              if (audioElement.duration && isFinite(audioElement.duration)) {
                const remaining = (audioElement.duration - audioElement.currentTime) * 1000 + 200;
                setTimeout(waitForEnd, remaining);
              } else {
                setTimeout(waitForEnd, 2000);
              }
              
              return;
            }
            
            audioElement.play().catch(e => {
              debugLog('Error playing next chunk:', e);
              // Only try the next chunk if we're still in an active playback state
              if (isPlayingRef.current) {
                debugLog('Playback failed, trying next chunk after delay');
                setTimeout(() => handleNextChunk(audioElement), 100);
              } else {
                debugLog('Not proceeding to next chunk due to inactive playback state');
              }
            });
          };
        } else {
          debugLog('No more chunks in queue');
          isPlayingRef.current = false;
          setIsPlaying(false);
          
          if (!isProcessing) {
            handlePlaybackComplete();
          }
        }
      };
      
      // Add this chunk to the pending chunks queue
      debugLog(`Adding chunk to queue (${pendingChunksRef.current.length} already in queue)`);
      pendingChunksRef.current.push(audioUrl);
      
      // If not currently playing, start playing the first chunk
      if (!isPlayingRef.current) {
        debugLog('Starting initial playback');
        isPlayingRef.current = true;
        
        const firstChunkUrl = pendingChunksRef.current.shift();
        const audio = audioBuffersRef.current.audio;
        
        audio.src = firstChunkUrl;
        audio.load(); // Important: reload after changing source
        
        // Make sure we have user interaction context for autoplay
        if (userInteractionContextRef.current) {
          try {
            const playPromise = audio.play();
            
            // Set a timeout to check if playback actually started
            const playbackCheckTimeout = setTimeout(() => {
              debugLog('Playback check timeout - checking if audio is actually playing');
              
              // Only proceed if we're still in playing state
              if (!isPlayingRef.current) {
                debugLog('No longer in playing state, skipping playback check');
                return;
              }
              
              // If the element isn't playing or has errors, try creating a new one
              if (!audio.currentTime || audio.error) {
                debugLog('Audio element appears to be stuck, creating a new one');
                
                // Create a new audio element as a fallback
                try {
                  // Clean up the old one first
                  audio.pause();
                  URL.revokeObjectURL(audio.src);
                  
                  // Create a new audio element
                  const newAudio = new Audio();
                  audioBuffersRef.current.audio = newAudio;
                  
                  // Set up the same event handlers (simplified version)
                  newAudio.onended = () => handleNextChunk(newAudio);
                  
                  // Try playing this chunk again
                  pendingChunksRef.current.unshift(firstChunkUrl);
                  handleNextChunk(newAudio);
                } catch (error) {
                  debugLog('Error creating fallback audio element:', error);
                }
              } else {
                debugLog(`Audio is playing - currentTime: ${audio.currentTime}s`);
              }
            }, 2000);
            
            // Clear the timeout if playback starts successfully
            playPromise.then(() => {
              clearTimeout(playbackCheckTimeout);
              debugLog('Started playing first audio chunk');
              setIsPlaying(true);
            }).catch(e => {
              clearTimeout(playbackCheckTimeout);
              debugLog('Error starting initial audio playback:', e);
              // Set autoplay failed flags
              autoplayFailedRef.current = true;
              setAutoplayFailed(true);
              isPlayingRef.current = false;
              
              // Put the URL back in the queue for later manual playback
              pendingChunksRef.current.unshift(firstChunkUrl);
            });
          } catch (e) {
            debugLog('Error starting initial audio playback:', e);
            // Set autoplay failed flags
            autoplayFailedRef.current = true;
            setAutoplayFailed(true);
            isPlayingRef.current = false;
            
            // Put the URL back in the queue for later manual playback
            pendingChunksRef.current.unshift(firstChunkUrl);
          }
        } else {
          debugLog('No user interaction context for autoplay');
          autoplayFailedRef.current = true;
          setAutoplayFailed(true);
          isPlayingRef.current = false;
          pendingChunksRef.current.unshift(firstChunkUrl);
        }
      } else {
        debugLog('Already playing, chunk queued for later');
      }
    } catch (error) {
      debugLog('Error in queueAndPlayAudio:', error);
      setError(`Audio playback error: ${error.message}`);
    }
  };
  
  // Playback control functions
  const pausePlayback = () => {
    if (audioBuffersRef.current.audio) {
      audioBuffersRef.current.audio.pause();
      isPlayingRef.current = false;
      setIsPaused(true);
      setIsPlaying(false);
    }
  };
  
  const resumePlayback = () => {
    if (audioBuffersRef.current.audio) {
      audioBuffersRef.current.audio.play()
        .then(() => {
          isPlayingRef.current = true;
          setIsPaused(false);
          setIsPlaying(true);
        })
        .catch(e => debugLog('Error resuming playback:', e));
    } else if (pendingChunksRef.current.length > 0) {
      const nextChunkUrl = pendingChunksRef.current.shift();
      if (!audioBuffersRef.current.audio) {
        audioBuffersRef.current.audio = new Audio();
      }
      audioBuffersRef.current.audio.src = nextChunkUrl;
      audioBuffersRef.current.audio.play()
        .then(() => {
          isPlayingRef.current = true;
          setIsPaused(false);
          setIsPlaying(true);
        })
        .catch(e => debugLog('Error resuming playback:', e));
    }
  };
  
  const stopPlayback = () => {
    // Guard against calling when already stopped
    if (!isPlayingRef.current && !isPaused) {
      debugLog('Playback already stopped, ignoring redundant stop call');
      return;
    }
    
    debugLog('Stopping audio playback');
    if (audioBuffersRef.current.audio) {
      // First pause the audio
      audioBuffersRef.current.audio.pause();
      
      // Remove event handlers to prevent callbacks during cleanup
      if (audioBuffersRef.current.audio.onended) {
        audioBuffersRef.current.audio.onended = null;
      }
      
      if (audioBuffersRef.current.audio.onerror) {
        audioBuffersRef.current.audio.onerror = null;
      }
      
      // Clear the source
      audioBuffersRef.current.audio.src = '';
      
      try {
        // Force reload to clear any buffered data
        audioBuffersRef.current.audio.load();
      } catch (e) {
        debugLog('Error reloading audio element:', e);
      }
    }
    
    // Clean up any pending URLs
    pendingChunksRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        debugLog('Error revoking object URL:', e);
      }
    });
    
    // Reset all playback state
    pendingChunksRef.current = [];
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    
    // If processing state is still active, reset it to ensure controls are available
    if (isProcessingRef.current) {
      debugLog('Resetting processing state after stopping playback');
      updateIsProcessing(false);
    }
    
    debugLog('Playback stopped, showing recording controls');
  };
  
  // Play all audio chunks from beginning (when autoplay failed)
  const startManualPlayback = () => {
    if (allAudioChunksUrlsRef.current.length > 0 && !isPlayingRef.current) {
      // Clear any existing pending chunks
      pendingChunksRef.current = [];
      
      // Create a copy of all URLs
      const allUrls = [...allAudioChunksUrlsRef.current];
      
      // Get the first URL and queue the rest
      const firstUrl = allUrls.shift();
      pendingChunksRef.current = allUrls;
      
      if (!audioBuffersRef.current.audio) {
        audioBuffersRef.current.audio = new Audio();
        
        audioBuffersRef.current.audio.onended = () => {
          if (pendingChunksRef.current.length > 0) {
            const nextUrl = pendingChunksRef.current.shift();
            audioBuffersRef.current.audio.src = nextUrl;
            audioBuffersRef.current.audio.play().catch(e => debugLog('Error playing next chunk:', e));
          } else {
            isPlayingRef.current = false;
            handlePlaybackComplete();
          }
        };
      }
      
      audioBuffersRef.current.audio.src = firstUrl;
      audioBuffersRef.current.audio.play()
        .then(() => {
          isPlayingRef.current = true;
          setAutoplayFailed(false);
          autoplayFailedRef.current = false;
          setIsPlaying(true);
        })
        .catch(e => {
          debugLog('Manual playback also failed:', e);
          setError('Could not play audio. Your browser may have strict autoplay policies.');
        });
    }
  };
  
  const handlePlaybackComplete = () => {
    // Guard against repeated calls
    if (isPlaybackCompleteRef.current) {
      debugLog('Playback already marked as complete, ignoring redundant call');
      return;
    }
    
    debugLog('Playback completed');
    isPlaybackCompleteRef.current = true;
    
    // Update UI state
    setIsPlaying(false);
    isPlayingRef.current = false;
    
    // Ensure processing state is reset
    if (isProcessingRef.current) {
      debugLog('Resetting processing state after playback completed');
      updateIsProcessing(false);
    }
    
    // Reset audio playback resources
    if (!autoplayFailedRef.current) {
      // Only clean up if autoplay didn't fail (otherwise we need to keep the audio for manual play)
      setTimeout(() => cleanupAudio(false), 100);
    }
    
    debugLog('Processing and playback both complete, resetting UI state');
  };
  
  const cleanupAudio = (preserveForReplay = false) => {
    try {
      // Don't cleanup if we're in autoplay failed state unless explicitly stopping
      if (autoplayFailedRef.current && preserveForReplay) {
        return;
      }
      
      // Only cleanup once
      if (!isPlayingRef.current && pendingChunksRef.current.length === 0 && 
          allAudioChunksUrlsRef.current.length === 0 && !preserveForReplay) {
        debugLog('Audio already cleaned up, skipping redundant cleanup');
        return;
      }
      
      // Cleanup audio elements
      if (!preserveForReplay) {
        stopPlayback();
        
        // Clean up all stored URL objects
        allAudioChunksUrlsRef.current.forEach(url => {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {
            debugLog('Error revoking URL during cleanup:', e);
          }
        });
        allAudioChunksUrlsRef.current = [];
        
        // Reset states
        isPlaybackCompleteRef.current = false;
        setAutoplayFailed(false);
        autoplayFailedRef.current = false;
        
        debugLog('Audio cleanup completed');
      }
    } catch (error) {
      debugLog('Non-critical cleanup error:', error);
    }
  };
  
  // Start recording with the microphone
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support audio recording');
      return;
    }
    
    try {
      // Clean up any previous recording/playback state
      cleanupAudio(false);
      
      // Clear all audio resources and reset playback state
      pendingChunksRef.current = [];
      allAudioChunksUrlsRef.current = [];
      isPlayingRef.current = false;
      isPlaybackCompleteRef.current = false;
      autoplayFailedRef.current = false;
      setIsPlaying(false);
      setIsPaused(false);
      setAutoplayFailed(false);
      
      // Clear previous transcript and response
      setTranscription('');
      setAiResponse('');
      setIsFinalTranscript(false);
      
      // Setup WebSocket connection
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        debugLog('Setting up WebSocket before recording');
        setupWebSocket();
      }
      
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        debugLog('WebSocket not connected, cannot start recording');
        setError('Not connected to server. Please try again.');
        return;
      }
      
      // Get microphone stream
      debugLog('Requesting microphone access');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophoneAccessGranted(true);
      
      // Store stream reference for cleanup
      streamRef.current = stream;
      
      // Set up audio analyzer for sound detection
      await initializeAudioContext();
      if (audioContextRef.current) {
        try {
          const audioSource = audioContextRef.current.createMediaStreamSource(stream);
          const analyser = audioContextRef.current.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          audioSource.connect(analyser);
          audioAnalyserRef.current = analyser;
          audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);
          debugLog('Audio analyzer set up for silence detection');
        } catch (e) {
          debugLog('Error setting up audio analyzer:', e);
        }
      }
      
      // Create and configure media recorder with appropriate MIME type
      debugLog('Creating MediaRecorder');
      
      // Get supported MIME type for this browser
      const mimeType = getSupportedMimeType();
      debugLog(`Using MIME type: ${mimeType || 'browser default'}`);
      
      // Create recorder with supported options
      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      recorderRef.current = recorder;
      mediaRecorderRef.current = recorder;
      
      // Log format that will be used
      debugLog(`MediaRecorder created with format: ${recorder.mimeType}`);
      
      // Clear previous data
      recordedChunksRef.current = [];
      chunkCounterRef.current = 0;
      
      // Set up a user interaction context for audio playback
      userInteractionContextRef.current = true;
      
      // Handle data available from recorder
      recorder.ondataavailable = async (event) => {
        // First check if this recorder is still active before processing data
        if (!recorderRef.current || recorderRef.current !== recorder) {
          debugLog('Ignoring data from inactive recorder');
          return;
        }
        
        if (!event.data || event.data.size === 0) {
          debugLog('No audio data received');
          return;
        }
        
        const chunkNum = ++chunkCounterRef.current;
        const chunkTime = new Date().toISOString();
        const chunkSize = event.data.size;
        
        debugLog(`[CHUNK ${chunkNum}] Received audio data at ${chunkTime}, size: ${chunkSize} bytes, type: ${event.data.type}`);
        
        try {
          // Check if recording is still active and we haven't sent end_stream yet
          if (!isRecordingRef.current) {
            debugLog(`[CHUNK ${chunkNum}] Recording no longer active, not sending chunk to server`);
            return;
          }
          
          if (socketRef.current?.readyState !== WebSocket.OPEN) {
            debugLog(`[CHUNK ${chunkNum}] WebSocket not open, cannot send chunk`);
            return;
          }
          
          // Convert audio blob to base64
          const startProcess = performance.now();
          const arrayBuffer = await event.data.arrayBuffer();
          const base64data = arrayBufferToBase64(arrayBuffer);
          const processTime = Math.round(performance.now() - startProcess);
          
          debugLog(`[CHUNK ${chunkNum}] Converted to base64 in ${processTime}ms, size: ${base64data.length} chars`);
          
          // Send the audio data to the server
          const sendStart = performance.now();
          socketRef.current.send(JSON.stringify({
            type: 'audio_data',
            audio: base64data,
            format: event.data.type || recorder.mimeType, // Send the actual format being used
            timestamp: chunkTime
          }));
          const sendTime = Math.round(performance.now() - sendStart);
          
          debugLog(`[CHUNK ${chunkNum}] Sent to server in ${sendTime}ms, total processing: ${processTime + sendTime}ms`);
        } catch (error) {
          debugLog(`[CHUNK ${chunkNum}] Error processing audio chunk:`, error);
        }
      };
      
      // Set recorder time slice to 500ms for more frequent chunks
      recorder.start(500);
      
      // Set the recording start time for max duration checks
      recordingStartTimeRef.current = Date.now();
      
      // Reset chunk counter
      chunkCounterRef.current = 0;
      
      // Send start_stream message to WebSocket
      debugLog('Sending start_stream message to server');
      socketRef.current.send(JSON.stringify({
        type: 'start_stream',
        session_id: sessionId || null
      }));
      debugLog('Start_stream message sent');
      
      // Update state
      isRecordingRef.current = true;
      setIsRecording(true);
      setError(null);
      
      // Start silence detection if enabled
      startSilenceDetection();
      
      debugLog('Recording started');
    } catch (error) {
      debugLog('Error starting recording:', error);
      setError(`Could not start recording: ${error.message}`);
    }
  };
  
  // Improved silence detection with audio analysis
  const startSilenceDetection = () => {
    // Only set up silence detection if auto-send is enabled
    if (!autoSendEnabled) {
      debugLog('Auto-send is disabled, not starting silence detection');
      return;
    }
    
    // Clear any existing detection
    clearSilenceDetection();
    
    // Set the initial last activity time
    lastAudioActivityRef.current = Date.now();
    
    // Set up interval to check for silence
    silenceDetectionIntervalRef.current = setInterval(() => {
      // Get current audio level if analyser is available
      if (audioAnalyserRef.current && audioDataRef.current) {
        try {
          audioAnalyserRef.current.getByteFrequencyData(audioDataRef.current);
          
          // Calculate average volume
          const values = audioDataRef.current;
          let sum = 0;
          for (let i = 0; i < values.length; i++) {
            sum += values[i];
          }
          const average = sum / values.length;
          
          // Update current audio level for debugging
          setCurrentAudioLevel(average);
          
          // If average volume is above threshold, update last activity time
          // Lowered threshold from 10 to 5 for better detection on mobile
          if (average > 5) {  
            lastAudioActivityRef.current = Date.now();
            debugLog(`Audio activity detected: ${average.toFixed(2)} (above threshold)`);
          } else {
            // Log current level but don't update timestamp
            debugLog(`Current audio level: ${average.toFixed(2)} (below threshold)`);
          }
        } catch (e) {
          debugLog('Error analyzing audio:', e);
        }
      }
      
      const now = Date.now();
      const timeSinceLastActivity = now - lastAudioActivityRef.current;
      
      // Send the stream if silence threshold is reached - using the state variable
      if (timeSinceLastActivity >= silenceThreshold) {
        debugLog(`Silence detected for ${timeSinceLastActivity}ms (threshold: ${silenceThreshold}ms) - stopping recording`);
        stopRecording(true);
      }
      
      // Also check for max duration
      const recordingDuration = now - recordingStartTimeRef.current;
      if (recordingDuration >= MAX_RECORDING_DURATION) {
        debugLog(`Maximum recording duration reached (${MAX_RECORDING_DURATION}ms)`);
        stopRecording(true);
      }
    }, 1000); // Increased from 500ms to 1000ms for less aggressive silence detection
  };
  
  // Clear silence detection
  const clearSilenceDetection = () => {
    if (silenceDetectionIntervalRef.current) {
      clearInterval(silenceDetectionIntervalRef.current);
      silenceDetectionIntervalRef.current = null;
    }
  };
  
  // Helper function to check supported MIME types
  const getSupportedMimeType = () => {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];
    
    for (const type of mimeTypes) {
      try {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      } catch (e) {
        debugLog(`Error checking support for ${type}:`, e);
      }
    }
    
    debugLog('No specified MIME type supported, using browser default');
    return undefined;
  };
  
  // Stop recording
  const stopRecording = (sendEndStream = true) => {
    // Prevent double sending of end_stream
    if (!isRecordingRef.current && sendEndStream) {
      debugLog('Not sending end_stream because recording already stopped');
      return;
    }
    
    debugLog(`Stopping recording, sendEndStream=${sendEndStream}`);
    
    // Stop silence detection
    clearSilenceDetection();
    
    // Stop the MediaRecorder if it exists and is recording
    if (recorderRef.current) {
      try {
        debugLog('Stopping recorderRef');
        // Remove the ondataavailable event handler before stopping
        recorderRef.current.ondataavailable = null;
        
        // Only call stop() if the recorder is actually recording
        if (recorderRef.current.state === 'recording') {
          recorderRef.current.stop();
        } else {
          debugLog(`recorderRef is in state ${recorderRef.current.state}, not calling stop()`);
        }
        recorderRef.current = null;
      } catch (e) {
        debugLog('Error stopping recorderRef:', e);
      }
    }
    
    if (mediaRecorderRef.current) {
      try {
        debugLog('Stopping mediaRecorderRef');
        // Remove the ondataavailable event handler before stopping
        mediaRecorderRef.current.ondataavailable = null;
        
        // Only call stop() if the recorder is actually recording
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        } else {
          debugLog(`mediaRecorderRef is in state ${mediaRecorderRef.current.state}, not calling stop()`);
        }
      } catch (e) {
        debugLog('Error stopping mediaRecorderRef:', e);
      }
    }
    
    // Stop all tracks in the stream
    if (streamRef.current) {
      debugLog('Stopping media stream tracks');
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          debugLog('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    
    // Update recording state first - before sending end_stream
    // This helps prevent double sending of end_stream
    setIsRecording(false);
    isRecordingRef.current = false;
    mediaRecorderRef.current = null;
    
    // Send end_stream message if required - with delay if needed
    if (sendEndStream && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      if (sendDelay > 0 && !isSending) {
        debugLog(`Delaying end_stream message by ${sendDelay}ms to capture remaining audio`);
        setIsSending(true);
        
        // Clear any existing timeout
        if (sendDelayTimeoutRef.current) {
          clearTimeout(sendDelayTimeoutRef.current);
        }
        
        // Set new timeout
        sendDelayTimeoutRef.current = setTimeout(() => {
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            debugLog('Sending delayed end_stream message to server');
            socketRef.current.send(JSON.stringify({
              type: 'end_stream'
            }));
            
            // Update UI to show processing state
            updateIsProcessing(true);
            setIsSending(false);
          } else {
            debugLog('WebSocket not open, cannot send end_stream');
            setIsSending(false);
          }
        }, sendDelay);
      } else {
        // Send immediately if no delay or already in sending state
        debugLog('Sending end_stream message to server immediately');
        socketRef.current.send(JSON.stringify({
          type: 'end_stream'
        }));
        
        // Update UI to show processing state
        updateIsProcessing(true);
      }
    }
  };
  
  // Clear any pending send delays
  const clearSendDelays = () => {
    if (sendDelayTimeoutRef.current) {
      clearTimeout(sendDelayTimeoutRef.current);
      sendDelayTimeoutRef.current = null;
    }
    setIsSending(false);
  };
  
  // Update send delay with validation
  const updateSendDelay = (value) => {
    const newValue = parseInt(value, 10);
    
    // Validate the delay is within reasonable bounds
    if (isNaN(newValue) || newValue < 0 || newValue > 2000) {
      debugLog(`Invalid send delay value: ${value}, ignoring`);
      return;
    }
    
    debugLog(`Setting send delay to ${newValue}ms`);
    setSendDelay(newValue);
    localStorage.setItem('sendDelay', newValue.toString());
  };
  
  // Cancel recording
  const handleCancel = () => {
    debugLog('User clicked Cancel button');
    
    // Clear any pending send delays
    clearSendDelays();
    
    // Send cancel message to server
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      debugLog('Sending cancel message to server');
      socketRef.current.send(JSON.stringify({
        type: 'cancel'
      }));
    }
    
    // Stop recording without sending end_stream
    stopRecording(false);
    
    // Reset all states - make sure processing is turned off immediately
    updateIsProcessing(false);
    setIsRecording(false);
    isRecordingRef.current = false;
    setTranscription('');
    setIsFinalTranscript(false);
    setAiResponse(''); // Clear AI response
    
    // Reset playback states too to ensure clean state
    setIsPlaying(false);
    isPlayingRef.current = false;
    setIsPaused(false);
    isPlaybackCompleteRef.current = false;
    
    // Clean up any audio playback
    cleanupAudio();
    
    debugLog('Recording cancelled, all states reset');
  };
  
  // Explicit send function
  const handleSend = () => {
    if (isRecording) {
      debugLog('User clicked Send button - ending recording and stream');
      
      // Visual feedback during the send delay
      if (sendDelay > 0) {
        setIsSending(true);
      }
      
      // Use the stopRecording function to ensure consistent behavior
      stopRecording(true);
      debugLog(`Handled send button - recording stopped, end_stream will be sent ${sendDelay > 0 ? `after ${sendDelay}ms delay` : 'immediately'}`);
    } else {
      debugLog('Send button clicked but not recording - ignoring');
    }
  };
  
  // Navigate to text chat
  const handleNavigateToTextChat = () => {
    if (sessionId) {
      navigate(`/ai-chat/${sessionId}`);
    } else {
      navigate('/ai-chat');
    }
  };
  
  // Initialize WebSocket connection
  useEffect(() => {
    setupWebSocket();
    
    // Reconnect when visibility changes (e.g., when user returns to the tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 
          (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)) {
        setupWebSocket();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up on component unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      clearSilenceDetection();
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      stopRecording(false);
      cleanupAudio();
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      debugLog('Network connection restored');
      setNetworkStatus('online');
      // Attempt to reconnect WebSocket if recording was in progress
      if (isRecording && !socketRef.current?.readyState === WebSocket.OPEN) {
        debugLog('Attempting to reconnect WebSocket after network restoration');
        setupWebSocket();
      }
    };
    
    const handleOffline = () => {
      debugLog('Network connection lost');
      setNetworkStatus('offline');
      setError('Network connection lost. Please check your internet connection.');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Add an effect to persist and load silence threshold settings
  useEffect(() => {
    // Setup event listener for storage changes from other tabs/windows
    const handleStorageChange = (e) => {
      if (e.key === 'silenceThreshold') {
        const newValue = parseInt(e.newValue, 10);
        if (!isNaN(newValue) && newValue !== silenceThreshold) {
          debugLog(`Silence threshold updated from another tab: ${newValue}ms`);
          setSilenceThreshold(newValue);
        }
      } else if (e.key === 'autoSendEnabled') {
        const newValue = e.newValue === 'true';
        if (newValue !== autoSendEnabled) {
          debugLog(`Auto-send setting updated from another tab: ${newValue}`);
          setAutoSendEnabled(newValue);
        }
      } else if (e.key === 'sendDelay') {
        const newValue = parseInt(e.newValue, 10);
        if (!isNaN(newValue) && newValue !== sendDelay) {
          debugLog(`Send delay updated from another tab: ${newValue}ms`);
          setSendDelay(newValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [silenceThreshold, autoSendEnabled, sendDelay]);
  
  // Add an effect that synchronizes connectionStatus with isConnected and isConnecting
  useEffect(() => {
    // Update isConnected and isConnecting based on connectionStatus
    debugLog(`Connection status changed to: ${connectionStatus}`);
    debugLog(`Current connection UI states - isConnected: ${isConnected}, isConnecting: ${isConnecting}`);
    
    if (connectionStatus === 'connected') {
      setIsConnected(true);
      setIsConnecting(false);
    } else if (connectionStatus === 'connecting') {
      setIsConnected(false);
      setIsConnecting(true);
    } else {
      // disconnected
      setIsConnected(false);
      setIsConnecting(false);
    }
    
    // Log the WebSocket state directly
    if (socketRef.current) {
      const wsState = socketRef.current.readyState;
      const wsStateStr = getWebSocketStateString(wsState);
      debugLog(`Current WebSocket state: ${wsStateStr} (${wsState})`);
    } else {
      debugLog('socketRef.current is null');
    }
  }, [connectionStatus]);
  
  // Update the retry connection button click handler
  const handleRetryConnection = () => {
    setupWebSocket();
  };
  
  // Helper function to check if WebSocket is actually connected
  const isWebSocketConnected = () => {
    return socketRef.current && socketRef.current.readyState === WebSocket.OPEN;
  };
  
  // Add a periodic connection check
  useEffect(() => {
    // Check connection status every 2 seconds
    const checkInterval = setInterval(() => {
      // First check if the UI state matches the actual WebSocket state
      const actuallyConnected = isWebSocketConnected();
      const uiShowsConnected = connectionStatus === 'connected';
      
      // If there's a mismatch, update the UI to match reality
      if (actuallyConnected !== uiShowsConnected) {
        debugLog(`Connection state mismatch detected. WebSocket is ${actuallyConnected ? 'connected' : 'not connected'} but UI shows ${uiShowsConnected ? 'connected' : 'not connected'}`);
        
        // Force UI update based on actual WebSocket state
        if (actuallyConnected) {
          setConnectionStatus('connected');
        } else if (socketRef.current && socketRef.current.readyState === WebSocket.CONNECTING) {
          setConnectionStatus('connecting');
        } else {
          setConnectionStatus('disconnected');
        }
      }
      
      // If we should be connected but the socket is closed, try to reconnect
      if (socketRef.current && socketRef.current.readyState === WebSocket.CLOSED && !isCleanupRef.current) {
        debugLog('WebSocket is closed when it should be open, attempting to reconnect');
        setupWebSocket();
      }
    }, 2000);
    
    return () => {
      clearInterval(checkInterval);
    };
  }, [connectionStatus]);
  
  // Custom setIsProcessing to keep ref and state in sync
  const updateIsProcessing = (value) => {
    debugLog(`Setting isProcessing ${isProcessingRef.current} -> ${value}`);
    isProcessingRef.current = value;
    setIsProcessing(value);
  };
  
  // Toggle auto-send feature
  const toggleAutoSend = (value) => {
    const newValue = value !== undefined ? value : !autoSendEnabled;
    setAutoSendEnabled(newValue);
    localStorage.setItem('autoSendEnabled', newValue.toString());
    
    // Clear current detection if disabling
    if (!newValue && silenceDetectionIntervalRef.current) {
      clearSilenceDetection();
    }
    // Start detection if enabling and currently recording
    else if (newValue && isRecordingRef.current) {
      startSilenceDetection();
    }
    
    return newValue;
  };
  
  // Update silence threshold with validation
  const updateSilenceThreshold = (value) => {
    const newValue = parseInt(value, 10);
    
    // Validate the threshold is within reasonable bounds
    if (isNaN(newValue) || newValue < 1000 || newValue > 10000) {
      debugLog(`Invalid silence threshold value: ${value}, ignoring`);
      return;
    }
    
    debugLog(`Setting silence threshold to ${newValue}ms`);
    setSilenceThreshold(newValue);
    localStorage.setItem('silenceThreshold', newValue.toString());
    
    // Restart silence detection if it's active and auto-send is enabled
    if (autoSendEnabled && silenceDetectionIntervalRef.current) {
      clearSilenceDetection();
      startSilenceDetection();
    }
  };

  // Format seconds for display
  const formatSeconds = (milliseconds) => {
    return (milliseconds / 1000).toFixed(1);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSendDelays();
    };
  }, []);
  
  return (
    <div className="streaming-voice-interface-container">
      <Card className="streaming-voice-interface">
        {/* Add debug button */}
        <div className="debug-info-button">
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={() => {
              const connectionDetails = `
WebSocket Info:
- URL: ${wsUrl.current || 'Not set'}
- State: ${socketRef.current ? getWebSocketStateString(socketRef.current.readyState) : 'No socket'}
- Chunks Sent: ${chunkCounterRef.current}
- Network: ${networkStatus}
- Auth Token: ${localStorage.getItem('access_token') ? 'Present' : 'Missing'}

Audio Info:
- Current Level: ${currentAudioLevel.toFixed(2)}
- Threshold: 5 (activity if above)
- Silence Timer: ${silenceThreshold}ms
- Auto-Send: ${autoSendEnabled ? 'Enabled' : 'Disabled'}
- Send Delay: ${sendDelay}ms
- Last Activity: ${lastAudioActivityRef.current ? new Date(lastAudioActivityRef.current).toISOString().split('T')[1].split('.')[0] : 'N/A'}

Options:
1. Toggle auto-send (currently ${autoSendEnabled ? 'ON' : 'OFF'})
              `;
              
              const option = prompt(connectionDetails, "Enter 1 to toggle auto-send");
              
              if (option === "1") {
                const newState = toggleAutoSend();
                alert(`Auto-send is now ${newState ? 'enabled' : 'disabled'}`);
              }
            }}
          >
            Debug
          </Button>
        </div>
        
        {/* Small indicator for auto-send status when recording */}
        {DEBUG && isRecording && (
          <div style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '50px', 
            fontSize: '10px',
            color: autoSendEnabled ? 'green' : 'red',
            backgroundColor: 'rgba(255,255,255,0.7)',
            padding: '2px 4px',
            borderRadius: '3px'
          }}>
            Auto-Send: {autoSendEnabled ? `ON (${formatSeconds(silenceThreshold)}s)` : 'OFF'}
          </div>
        )}

        {/* Auto-Send Settings Button - in top right corner */}
        <div className="auto-send-settings-button">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            title="Auto-Send Settings"
            className={autoSendEnabled ? "active-setting" : ""}
          >
            <Settings size={16} />
            {autoSendEnabled && <span className="setting-indicator"></span>}
          </Button>
        </div>
        
        {/* Auto-Send Settings Panel */}
        {showSettings && (
          <div className="auto-send-settings-panel">
            <div className="settings-header">
              <h5>Voice Settings</h5>
              <Button 
                variant="link" 
                className="close-button" 
                onClick={() => setShowSettings(false)}
              >
                <X size={18} />
              </Button>
            </div>
            
            <Form>
              <Form.Group className="mb-3">
                <Form.Check 
                  type="switch"
                  id="auto-send-switch"
                  label={<strong>Auto-Send</strong>}
                  checked={autoSendEnabled}
                  onChange={(e) => toggleAutoSend(e.target.checked)}
                />
                <Form.Text className="text-muted">
                  Automatically send after silence is detected
                </Form.Text>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label className={autoSendEnabled ? "text-primary fw-medium" : "text-muted"}>
                  Silence Threshold: <strong>{formatSeconds(silenceThreshold)} seconds</strong>
                </Form.Label>
                <Form.Range 
                  min="1000" 
                  max="10000" 
                  step="500"
                  value={silenceThreshold}
                  onChange={(e) => updateSilenceThreshold(e.target.value)}
                  disabled={!autoSendEnabled}
                />
                <div className="d-flex justify-content-between">
                  <small className="range-label">1s</small>
                  <small className="range-label">10s</small>
                </div>
              </Form.Group>
              
              <hr className="settings-divider" />
              
              <Form.Group className="mb-3">
                <Form.Label className="fw-medium">
                  Send Delay: <strong>{sendDelay}ms</strong>
                </Form.Label>
                <Form.Range 
                  min="0" 
                  max="2000" 
                  step="100"
                  value={sendDelay}
                  onChange={(e) => updateSendDelay(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Delay before sending after pressing Send button
                </Form.Text>
                <div className="d-flex justify-content-between">
                  <small className="range-label">0ms</small>
                  <small className="range-label">2000ms</small>
                </div>
              </Form.Group>
            </Form>
          </div>
        )}

        {/* Connection status indicator */}
        <div className="connection-status">
          <span className={`status-indicator ${isWebSocketConnected() ? 'connected' : (socketRef.current && socketRef.current.readyState === WebSocket.CONNECTING ? 'connecting' : 'disconnected')}`}></span>
          <span className="status-text">
            {isWebSocketConnected() ? 'Connected' : (socketRef.current && socketRef.current.readyState === WebSocket.CONNECTING ? 'Connecting...' : 'Disconnected')}
          </span>
          {autoSendEnabled && (
            <span className="auto-send-indicator ml-2">
              <span className="indicator-dot"></span>
              Auto: {formatSeconds(silenceThreshold)}s
            </span>
          )}
          {sendDelay > 0 && (
            <span className="send-delay-indicator">
              <span className="indicator-dot delay-dot"></span>
              Delay: {sendDelay}ms
            </span>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="error-container">
            <Alert 
              variant="danger" 
              className="error-message"
              dismissible
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          </div>
        )}

        {/* Browser not supported message */}
        {!browserSupported && (
          <div className="browser-not-supported">
            <Alert variant="warning" className="browser-warning">
              Your browser doesn't support the required features for voice chat.
            </Alert>
            <Button 
              className="fallback-button" 
              onClick={handleNavigateToTextChat}
            >
              <Keyboard size={18} />
              Switch to Text Chat
            </Button>
          </div>
        )}

        {/* Main content */}
        {browserSupported && (
          <div className="main-content-container">
            {/* Controls based on state - moved to the top */}
            <div className="controls-area">
              {!isConnected && !isConnecting && (
                <div className="disconnected-controls">
                  <div className="connection-message">Not connected to server</div>
                  <Button 
                    className="retry-button" 
                    variant="primary"
                    onClick={handleRetryConnection}
                  >
                    Retry Connection
                  </Button>
                </div>
              )}

              {/* Voice controls */}
              {isConnected && !isRecording && !isProcessingRef.current && !isPlaying && !isPaused && !autoplayFailed && (
                <div className="voice-controls">
                  <Button
                    className="record-button"
                    variant="primary"
                    onClick={startRecording}
                    disabled={!isConnected || isRecording}
                    style={{ width: '80px', height: '80px', borderRadius: '50%' }}
                  >
                    <Mic size={28} color="white" />
                  </Button>
                </div>
              )}

              {/* Recording controls */}
              {isRecording && (
                <div className="recording-controls">
                  <div className="recording-indicator">
                    <span className="pulse"></span>
                    Recording...
                  </div>
                  <div className="recording-buttons">
                    <Button
                      className="send-button"
                      variant="success"
                      onClick={handleSend}
                      disabled={isSending}
                    >
                      <Send size={20} />
                    </Button>
                    <Button
                      className="cancel-button"
                      variant="danger"
                      onClick={handleCancel}
                      disabled={isSending}
                    >
                      <X size={20} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Processing indicator - only show when not recording and no playback is happening */}
              {isProcessingRef.current && !isRecording && !isPlaying && !isPaused && !autoplayFailed && (
                <div className="streaming-indicator">
                  <Spinner animation="border" size="sm" />
                  Processing...
                </div>
              )}

              {/* Playback controls */}
              {isPlaying && (
                <div className="voice-playback">
                  <div className="voice-playback__controls">
                    <Button
                      className="voice-playback__button"
                      onClick={pausePlayback}
                    >
                      <Pause size={20} />
                    </Button>
                    <Button
                      className="voice-playback__button voice-playback__button--stop"
                      onClick={stopPlayback}
                    >
                      <Square size={20} />
                    </Button>
                  </div>
                </div>
              )}

              {isPaused && (
                <div className="voice-playback">
                  <div className="voice-playback__controls">
                    <Button
                      className="voice-playback__button"
                      onClick={resumePlayback}
                    >
                      <Play size={20} />
                    </Button>
                    <Button
                      className="voice-playback__button voice-playback__button--stop"
                      onClick={stopPlayback}
                    >
                      <Square size={20} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Autoplay failed message */}
              {autoplayFailed && (
                <Alert variant="info" className="autoplay-warning">
                  <p>Autoplay was blocked by your browser.</p>
                  <div className="d-flex gap-2 mt-2">
                    <Button
                      className="voice-playback__button"
                      onClick={startManualPlayback}
                    >
                      <Play size={20} />
                    </Button>
                    {pendingChunksRef.current.length > 0 && (
                      <Button
                        className="voice-playback__button voice-playback__button--stop"
                        onClick={stopPlayback}
                      >
                        <Square size={20} />
                      </Button>
                    )}
                  </div>
                </Alert>
              )}
            </div>
            
            {/* Messages display area with fixed heights and scrolling */}
            <div className="messages-area">
              {/* Transcription display - always visible */}
              <div className="transcription-container">
                {transcription ? (
                  <div className={`transcription-text ${isFinalTranscript ? 'final' : ''}`}>
                    {transcription}
                  </div>
                ) : (
                  <div className="transcription-empty">
                    Your speech will appear here...
                  </div>
                )}
              </div>
              
              {/* AI Response display - always visible */}
              <div className="ai-response-container">
                <div className="ai-response-label">AI Response:</div>
                {aiResponse ? (
                  <div className="ai-response-text">
                    {aiResponse}
                  </div>
                ) : (
                  <div className="ai-response-empty">
                    AI response will appear here...
                  </div>
                )}
              </div>
            </div>

            {/* Text chat button */}
            <div className="top-icon">
              <Button 
                variant="light" 
                onClick={handleNavigateToTextChat}
                title="Switch to text chat"
              >
                <Keyboard size={24} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WebSocketVoice;