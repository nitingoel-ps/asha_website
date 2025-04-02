import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Spinner, Alert, Form } from 'react-bootstrap';
import { Mic, Square, X, Pause, Play, Keyboard, Send, Settings } from 'lucide-react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import './WebSocketVoice.css';
import VoiceVisualization from './VoiceVisualization';

// DEBUG mode - set to true for verbose logging
const DEBUG = true;

// Debug log function
const debugLog = (...args) => {
  if (DEBUG) {
    console.log('[WebSocketVoice]', ...args);
  }
};

// Default setting for silence detection
const DEFAULT_AUTO_SEND_ENABLED = false; // Changed from true to false
const DEFAULT_SILENCE_THRESHOLD = 3000; // Changed from 5000 to 3000 (3.0 seconds)
const DEFAULT_SEND_DELAY = 700; // Changed from 500 to 700ms
const DEFAULT_SHOW_TRANSCRIPTION = false; // Default to not showing transcription
const DEFAULT_SHOW_AI_RESPONSE = false; // Default to not showing AI response

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
  const { sessionId } = useParams();
  
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
  const audioBuffersRef = useRef({
    audio: null
  });
  const pendingChunksRef = useRef([]);
  const allAudioChunksUrlsRef = useRef([]);
  const allAudioChunksMetaRef = useRef([]); // Store metadata for each chunk
  const chunkIdCounterRef = useRef(0); // Counter for generating unique chunk IDs
  const isPlayingRef = useRef(false);
  const userInteractionContextRef = useRef(null);
  const autoplayFailedRef = useRef(false);
  const isPlaybackCompleteRef = useRef(false);
  const audioAnalyserRef = useRef(null);
  const audioDataRef = useRef(null);
  const playbackVisualizationRef = useRef(null);
  const playbackWatchdogRef = useRef(null); // Watchdog timer for stalled playback
  const isProcessingCompleteRef = useRef(false); // Track if server processing is complete
  
  // Silence detection constants
  const MAX_RECORDING_DURATION = 120000; // changed from 30 seconds to 2 minutes
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
  
  // Add state for accumulated transcripts
  const [accumulatedTranscripts, setAccumulatedTranscripts] = useState('');
  
  // Add new states for display toggles
  const [showTranscription, setShowTranscription] = useState(
    localStorage.getItem('showTranscription') !== null
      ? localStorage.getItem('showTranscription') === 'true'
      : DEFAULT_SHOW_TRANSCRIPTION
  );
  const [showAiResponse, setShowAiResponse] = useState(
    localStorage.getItem('showAiResponse') !== null
      ? localStorage.getItem('showAiResponse') === 'true'
      : DEFAULT_SHOW_AI_RESPONSE
  );
  
  // Add this to the state variables in the WebSocketVoice component
  const [visualizationMode, setVisualizationMode] = useState(
    localStorage.getItem('visualizationMode') || 'circle'
  );
  
  // Add new ref for pending navigation at the top with other refs
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const pendingNavigationRef = useRef(null);
  
  // Add new state for no speech detection
  const [noSpeechDetected, setNoSpeechDetected] = useState(false);
  
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
      const timestampISO = new Date().toISOString();
      debugLog(`[RECEIVED ${timestampISO}] Message type: ${message.type}`);
      
      switch (message.type) {
        case 'stream_started':
          debugLog('Server acknowledged stream start');
          if (isRecordingRef.current) { // Only update if still recording
            updateIsProcessing(true);
          }
          break;
          
        case 'transcript':
          debugLog(`Transcript message received: "${message.transcript}", full: "${message.full_transcript}"`);
          
          // Use the full_transcript field to display the complete transcription
          if (message.full_transcript) {
            setTranscription(message.full_transcript);
            setIsFinalTranscript(message.is_final);
            
            // If this is a final transcript, update the accumulated transcripts too
            if (message.is_final) {
              setAccumulatedTranscripts(message.full_transcript);
            }
          } else if (message.transcript) {
            // Fallback to regular transcript if full_transcript is not available
            setTranscription(message.transcript);
            setIsFinalTranscript(message.is_final);
            
            if (message.is_final) {
              setAccumulatedTranscripts(message.transcript);
            }
          }
          break;
          
        case 'transcript_update':
          debugLog(`Transcript update: "${message.transcript}"`);
          setTranscription(message.transcript);
          setIsFinalTranscript(message.is_final);
          
          // Always update the transcription display regardless of is_final
          // This ensures we show real-time transcripts as they arrive
          if (message.transcript) {
            // For non-final transcripts, we'll show them immediately without adding to accumulated
            if (!message.is_final) {
              // Just show it in the regular transcription field
              setTranscription(message.transcript);
            } else {
              // If this is a final transcript, append it to accumulated transcripts
              setAccumulatedTranscripts(prev => {
                // Add a space between transcripts
                const separator = prev ? ' ' : '';
                return prev + separator + message.transcript;
              });
            }
          }
          break;
          
        case 'transcript_final':
          debugLog(`Final transcript: "${message.transcript}"`);
          // For transcript_final, replace everything with the final version
          setTranscription(message.transcript);
          setAccumulatedTranscripts(message.transcript);
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
          debugLog(`Server signaled processing complete`);
          
          // Set the flag for processing completion
          isProcessingCompleteRef.current = true;
          
          // Check if audio is still playing
          if (isPlayingRef.current) {
            debugLog(`Audio is currently playing, will reset processing state after playback`);
          } else {
            // No audio is playing, reset processing state immediately
            debugLog(`No audio is playing, resetting processing state immediately`);
            updateIsProcessing(false);
            // Reset the flag since we've handled it
            isProcessingCompleteRef.current = false;
          }
          break;
          
        case 'tools_update':
          debugLog(`Tools update message received: "${message.text}"`);
          
          // Check if the text contains a reference in the format <<Ref: type/value>>
          if (message.text && message.text.includes('<<Ref:')) {
            const refMatch = message.text.match(/<<Ref:\s*([^\/]+)\/([^>]+)>>/);
            if (refMatch) {
              const [_, refType, refValue] = refMatch;
              let navigationTarget;
              
              if (refType === 'section') {
                // For section references, navigate directly to the section
                navigationTarget = `/patient-dashboard/${refValue}`;
                debugLog(`Detected section navigation reference: ${navigationTarget}`);
              } else {
                // For object references, include both the type and id
                navigationTarget = `/patient-dashboard/${refType}/${refValue}`;
                debugLog(`Detected object navigation reference: ${navigationTarget}`);
              }
              
              // Store the navigation target for use after playback completes
              setPendingNavigation(navigationTarget);
              pendingNavigationRef.current = navigationTarget;
            }
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
          
        case 'no_speech_detected':
          debugLog('No speech detected in audio');
          setNoSpeechDetected(true);
          // Reset recording and processing states
          updateIsProcessing(false);
          setIsRecording(false);
          isRecordingRef.current = false;
          stopRecording(false); // Don't send another end_stream
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
    try {
      debugLog('Initializing AudioContext');
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        debugLog(`Created new AudioContext, state: ${audioContextRef.current.state}, sampleRate: ${audioContextRef.current.sampleRate}`);
      }
      
      if (audioContextRef.current.state === 'suspended') {
        debugLog('AudioContext is suspended, attempting to resume');
        await audioContextRef.current.resume();
        debugLog(`AudioContext resumed, new state: ${audioContextRef.current.state}`);
      }
      
      return audioContextRef.current;
    } catch (error) {
      debugLog(`Error initializing AudioContext: ${error.message}`);
      setError(`Error initializing audio: ${error.message}`);
      throw error;
    }
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
  
  // Function to queue and play audio data
  const queueAndPlayAudio = async (arrayBuffer) => {
    try {
      // Generate unique chunk ID for this audio piece
      const chunkId = chunkIdCounterRef.current++;
      
      // Convert array buffer to a Blob
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
      
      // Create a URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Store metadata about this chunk
      const chunkMeta = {
        id: chunkId,
        url: url,
        size: blob.size,
        timestamp: Date.now(),
        played: false
      };
      
      // Add to our metadata tracking
      allAudioChunksMetaRef.current.push(chunkMeta);
      
      debugLog(`[Chunk ${chunkId}] Created audio blob URL: ${url}, size: ${blob.size} bytes`);
      
      // Initialize audio element on first playback
      if (!audioBuffersRef.current.audio) {
        debugLog(`[Chunk ${chunkId}] Creating new Audio element for playback`);
        
        // Create a new audio element
        audioBuffersRef.current.audio = createAudioElement();
      }
      
      // Get the current audio element reference
      const audioElement = audioBuffersRef.current.audio;
      
      // Add this chunk to the queue
      pendingChunksRef.current.push({
        url,
        id: chunkId
      });
      
      debugLog(`[Chunk ${chunkId}] Adding chunk to queue (${pendingChunksRef.current.length - 1} already in queue)`);
      
      // If this is the first chunk or we're not currently playing, start playback
      if (pendingChunksRef.current.length === 1 && !isPlayingRef.current) {
        debugLog(`[Chunk ${chunkId}] Starting initial playback`);
        
        // Set playing state
        isPlayingRef.current = true;
        setIsPlaying(true);
        
        // Start the first chunk
        const firstChunk = pendingChunksRef.current.shift();
        audioElement.src = firstChunk.url;
        audioElement.dataset.chunkId = firstChunk.id;
        
        // Start visualization if not already started
        startPlaybackVisualization();
        
        // Set watchdog timer based on chunk duration
        setChunkWatchdog(audioElement, firstChunk.id);
        
        try {
          // Play the audio
          await audioElement.play();
          debugLog(`[Chunk ${firstChunk.id}] Started playing first audio chunk`);
          markChunkAsPlayed(firstChunk.id);
          
        } catch (error) {
          debugLog(`[Chunk ${firstChunk.id}] Error playing first chunk:`, error);
          // Move on to next chunk if there is one
          if (pendingChunksRef.current.length > 0) {
            handleNextChunk(audioElement);
          } else {
            // No more chunks to play
            isPlayingRef.current = false;
            setIsPlaying(false);
            
            // If processing is complete, update the state
            if (isProcessingCompleteRef.current) {
              updateIsProcessing(false);
            }
          }
        }
      } else {
        // Already playing, so just queue this chunk
        debugLog(`[Chunk ${chunkId}] Setting up playback watchdog timer`);
        
        // If this is the second chunk and the first chunk is still playing
        if (pendingChunksRef.current.length === 1 && isPlayingRef.current) {
          debugLog(`[Chunk ${chunkId}] Already playing, chunk queued for later`);
        }
      }
      
      return true;
    } catch (e) {
      debugLog('Error in queueAndPlayAudio:', e);
      return false;
    }
  };
  
  // Function to try to estimate audio duration
  const tryToEstimateAudioDuration = async (url, chunkId = 'unknown') => {
    return new Promise((resolve) => {
      debugLog(`[Chunk ${chunkId}] Trying to estimate audio length from blob URL`);
      
      // Create temporary audio element to get duration
      const tempAudio = new Audio();
      tempAudio.preload = 'metadata';
      tempAudio.src = url;
      
      // Set a timeout in case metadata never loads
      const timeoutId = setTimeout(() => {
        debugLog(`[Chunk ${chunkId}] Setting fixed safety timeout of 6000ms - cannot determine audio duration`);
        tempAudio.removeEventListener('loadedmetadata', onMetadataLoaded);
        tempAudio.removeEventListener('error', onError);
        resolve(6); // Default to 6 seconds
      }, 500);
      
      const onMetadataLoaded = () => {
        clearTimeout(timeoutId);
        if (tempAudio.duration && isFinite(tempAudio.duration)) {
          debugLog(`[Chunk ${chunkId}] Detected audio duration: ${tempAudio.duration.toFixed(3)}s`);
          resolve(tempAudio.duration);
        } else {
          debugLog(`[Chunk ${chunkId}] Could not determine duration from metadata`);
          resolve(6); // Default to 6 seconds
        }
        tempAudio.removeEventListener('loadedmetadata', onMetadataLoaded);
        tempAudio.removeEventListener('error', onError);
        tempAudio.src = '';
      };
      
      const onError = (e) => {
        clearTimeout(timeoutId);
        debugLog(`[Chunk ${chunkId}] Error loading audio metadata:`, e);
        resolve(6); // Default to 6 seconds
        tempAudio.removeEventListener('loadedmetadata', onMetadataLoaded);
        tempAudio.removeEventListener('error', onError);
        tempAudio.src = '';
      };
      
      tempAudio.addEventListener('loadedmetadata', onMetadataLoaded);
      tempAudio.addEventListener('error', onError);
    });
  };
  
  // Function to create watchdog for chunk playback
  const setChunkWatchdog = (audioElement, chunkId, detectedDuration = null) => {
    // First clear any existing safety timeout
    if (audioElement.safetyTimeoutId) {
      clearTimeout(audioElement.safetyTimeoutId);
      audioElement.safetyTimeoutId = null;
    }
    
    // If we were given a duration, use it directly
    if (detectedDuration !== null && isFinite(detectedDuration)) {
      const timeoutMs = Math.ceil(detectedDuration * 1000) + 1000; // Add 1s buffer
      debugLog(`[Chunk ${chunkId}] Updated safety timeout to ${timeoutMs}ms after detecting duration ${detectedDuration.toFixed(3)}s`);
      
      // Set a new safety timeout based on the detected duration
      audioElement.safetyTimeoutId = setTimeout(() => {
        debugLog(`[Chunk ${chunkId}] Safety timeout triggered after ${timeoutMs}ms`);
        
        // Check if still playing this chunk
        if (audioElement.dataset.chunkId == chunkId && !audioElement.ended) {
          debugLog(`[Chunk ${chunkId}] Chunk playback appears to be stuck, forcing advancement`);
          handleNextChunk(audioElement);
        }
      }, timeoutMs);
      
      return timeoutMs;
    }
    
    // If we don't have a duration, try to estimate from the source URL
    if (audioElement.src) {
      (async () => {
        try {
          // Try to get chunk ID more reliably
          const currentChunkId = audioElement.dataset.chunkId || getCurrentPlayingChunkId(audioElement.src) || chunkId;
          
          // Delay before checking duration to give the browser time to load metadata
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // First try to get duration from the audio element if loaded
          if (audioElement.duration && isFinite(audioElement.duration)) {
            const timeoutMs = Math.ceil(audioElement.duration * 1000) + 1000; // Add 1s buffer
            debugLog(`[Chunk ${currentChunkId}] Updated safety timeout to ${timeoutMs}ms after detecting duration ${audioElement.duration.toFixed(3)}s`);
            
            // Set a new safety timeout based on the detected duration
            audioElement.safetyTimeoutId = setTimeout(() => {
              debugLog(`[Chunk ${currentChunkId}] Safety timeout triggered after ${timeoutMs}ms`);
              
              // Check if still playing this chunk
              if (!audioElement.ended) {
                debugLog(`[Chunk ${currentChunkId}] Chunk playback appears to be stuck, forcing advancement`);
                handleNextChunk(audioElement);
              }
            }, timeoutMs);
            
            return;
          }
          
          // If audio element doesn't have duration, try to estimate from the source
          const estimatedDuration = await tryToEstimateAudioDuration(audioElement.src, currentChunkId);
          const timeoutMs = Math.ceil(estimatedDuration * 1000) + 1000; // Add 1s buffer
          
          // Set a new safety timeout based on the estimated duration
          audioElement.safetyTimeoutId = setTimeout(() => {
            debugLog(`[Chunk ${currentChunkId}] Safety timeout triggered after ${timeoutMs}ms`);
            
            // Check if still playing this chunk
            if (!audioElement.ended) {
              debugLog(`[Chunk ${currentChunkId}] Chunk playback appears to be stuck, forcing advancement`);
              handleNextChunk(audioElement);
            }
          }, timeoutMs);
        } catch (e) {
          debugLog(`[Chunk ${chunkId}] Error setting chunk watchdog:`, e);
          
          // Set a conservative default timeout
          audioElement.safetyTimeoutId = setTimeout(() => {
            debugLog(`[Chunk ${chunkId}] Default safety timeout triggered`);
            handleNextChunk(audioElement);
          }, 6000);
        }
      })();
    } else {
      // No source, set a conservative default timeout
      debugLog(`[Chunk ${chunkId}] No source URL, setting default safety timeout`);
      audioElement.safetyTimeoutId = setTimeout(() => {
        debugLog(`[Chunk ${chunkId}] Default safety timeout triggered`);
        handleNextChunk(audioElement);
      }, 6000);
    }
  };
  
  // Playback control functions
  const pausePlayback = () => {
    if (audioBuffersRef.current.audio) {
      audioBuffersRef.current.audio.pause();
      isPlayingRef.current = false;
      setIsPaused(true);
      setIsPlaying(false);
      
      // Stop visualization animation when paused
      stopPlaybackVisualization();
    }
  };
  
  const resumePlayback = () => {
    if (audioBuffersRef.current.audio) {
      audioBuffersRef.current.audio.play()
        .then(() => {
          isPlayingRef.current = true;
          setIsPaused(false);
          setIsPlaying(true);
          
          // Start visualization animation when resuming
          startPlaybackVisualization();
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
          
          // Start visualization animation when resuming
          startPlaybackVisualization();
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
    
    // Clear any active watchdog timer
    if (playbackWatchdogRef.current) {
      clearTimeout(playbackWatchdogRef.current);
      playbackWatchdogRef.current = null;
      debugLog('Cleared playback watchdog timer');
    }
    
    // Stop visualization animation when stopping playback
    stopPlaybackVisualization();
    
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
          
          // Start visualization for manual playback
          startPlaybackVisualization();
        })
        .catch(e => {
          debugLog('Manual playback also failed:', e);
          setError('Could not play audio. Your browser may have strict autoplay policies.');
        });
    }
  };
  
  const handlePlaybackComplete = () => {
    // Log completion
    debugLog('Playback completed');
    
    // Stop visualization
    stopPlaybackVisualization();
    
    // Reset states
    isPlayingRef.current = false;
    setIsPlaying(false);
    
    // Only reset processing state if processing_complete message was received
    if (isProcessingCompleteRef.current) {
      debugLog('Resetting processing state after playback completed (processing_complete received)');
      updateIsProcessing(false);
      isProcessingCompleteRef.current = false;
      debugLog('Processing and playback both complete, resetting UI state');
    } else {
      debugLog('Playback completed but still waiting for more chunks or processing_complete');
      // We're still waiting for more chunks or the processing_complete message
      // Don't reset processing state yet
    }
    
    // Create a summary of chunk playback
    debugChunkSummary();
    
    // Clean up audio resources but preserve for replay
    cleanupAudio(true);
  };
  
  // Clean up audio resources
  const cleanupAudio = (preserveForReplay = false) => {
    // Stop any visualization updates
    stopPlaybackVisualization();
    
    // Only clean up URLs if not preserving for replay
    if (!preserveForReplay) {
      // Clean up stored audio URLs
      allAudioChunksUrlsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          debugLog('Error revoking URL during cleanup:', e);
        }
      });
      allAudioChunksUrlsRef.current = [];
      
      // Clean up audio element if not needed
      if (audioBuffersRef.current.audio) {
        try {
          // First pause the audio if it's playing
          audioBuffersRef.current.audio.pause();
          
          // Remove event listeners to avoid memory leaks
          audioBuffersRef.current.audio.onended = null;
          audioBuffersRef.current.audio.onpause = null;
          audioBuffersRef.current.audio.onplay = null;
          audioBuffersRef.current.audio.onerror = null;
          
          // Clear source
          if (audioBuffersRef.current.audio.src) {
            audioBuffersRef.current.audio.src = '';
            audioBuffersRef.current.audio.load();
          }
        } catch (e) {
          debugLog('Error cleaning up audio element:', e);
        }
      }
      
      // We don't reset the analyzer ref as it's reused between sessions
      // This is important to keep visualizations working on subsequent plays
    }
    
    // Reset states
    isPlaybackCompleteRef.current = false;
    setAutoplayFailed(false);
    autoplayFailedRef.current = false;
    
    debugLog('Audio cleanup completed');
  };
  
  // Start recording with the microphone
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support audio recording');
      return;
    }
    
    try {
      // Clear any previous recording/playback state
      cleanupAudio(false);
      
      // Clear no speech alert if it was showing
      setNoSpeechDetected(false);
      
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
      setAccumulatedTranscripts(''); // Clear accumulated transcripts
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
    
    // Clear no speech alert if it was showing
    setNoSpeechDetected(false);
    
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
    setAccumulatedTranscripts(''); // Clear accumulated transcripts
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
      } else if (e.key === 'showTranscription') {
        const newValue = e.newValue === 'true';
        if (newValue !== showTranscription) {
          debugLog(`Show transcription updated from another tab: ${newValue}`);
          setShowTranscription(newValue);
        }
      } else if (e.key === 'showAiResponse') {
        const newValue = e.newValue === 'true';
        if (newValue !== showAiResponse) {
          debugLog(`Show AI response updated from another tab: ${newValue}`);
          setShowAiResponse(newValue);
        }
      } else if (e.key === 'visualizationMode') {
        if (e.newValue !== visualizationMode) {
          debugLog(`Visualization mode updated from another tab: ${e.newValue}`);
          setVisualizationMode(e.newValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [silenceThreshold, autoSendEnabled, sendDelay, showTranscription, showAiResponse, visualizationMode]);
  
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
      setNoSpeechDetected(false); // Clear no speech alert on unmount
    };
  }, []);
  
  // Toggle display settings
  const toggleTranscription = (value) => {
    const newValue = value !== undefined ? value : !showTranscription;
    setShowTranscription(newValue);
    localStorage.setItem('showTranscription', newValue.toString());
    return newValue;
  };

  const toggleAiResponse = (value) => {
    const newValue = value !== undefined ? value : !showAiResponse;
    setShowAiResponse(newValue);
    localStorage.setItem('showAiResponse', newValue.toString());
    return newValue;
  };
  
  // Add this function to update the visualization mode
  const updateVisualizationMode = (mode) => {
    setVisualizationMode(mode);
    localStorage.setItem('visualizationMode', mode);
  };
  
  // Add handler to dismiss no speech alert
  const handleDismissNoSpeech = () => {
    setNoSpeechDetected(false);
  };
  
  // Export settings state handler function
  useEffect(() => {
    // Make settings functionality accessible to parent components
    if (window.voiceSettingsHandlers) {
      window.voiceSettingsHandlers = {
        showSettings,
        setShowSettings,
        toggleSettings: () => setShowSettings(!showSettings)
      };
    } else {
      window.voiceSettingsHandlers = {
        showSettings,
        setShowSettings,
        toggleSettings: () => setShowSettings(!showSettings)
      };
    }

    return () => {
      // Cleanup when component unmounts
      window.voiceSettingsHandlers = null;
    };
  }, [showSettings]);
  
  // Function to simulate audio levels during playback for visualization
  const startPlaybackVisualization = () => {
    // Clear any existing interval
    stopPlaybackVisualization();
    
    // Create an interval to update the audio level based on oscillating pattern
    playbackVisualizationRef.current = setInterval(() => {
      if (isPlayingRef.current && !isPaused) {
        // Create a dynamic audio level that varies between 30-70%
        // Using a sin wave with random variations for a natural feel
        const baseLevel = 50; // Base level at 50%
        const amplitude = 20; // Oscillation amplitude
        const now = Date.now() / 1000; // Current time in seconds
        
        // Main oscillation with a period of about 0.5 seconds
        const oscillation = Math.sin(now * 12) * amplitude;
        
        // Add some random variation
        const randomVariation = (Math.random() - 0.5) * 10;
        
        // Calculate final level (clamped between 30-70%)
        const level = Math.max(30, Math.min(70, baseLevel + oscillation + randomVariation));
        
        setCurrentAudioLevel(level);
      }
    }, 50); // Update 20 times per second
  };
  
  // Function to stop visualization updates
  const stopPlaybackVisualization = () => {
    if (playbackVisualizationRef.current) {
      clearInterval(playbackVisualizationRef.current);
      playbackVisualizationRef.current = null;
    }
  };
  
  // Function to create a new audio element with all necessary event handlers
  const createAudioElement = () => {
    const audio = new Audio();
    
    // Create a property to track safety timeouts
    audio.safetyTimeoutId = null;
    
    // Add preload attribute to ensure audio is ready before playing
    audio.preload = 'auto';
    
    // Connect audio to analyzer for visualization
    connectAudioToAnalyzer(audio);
    
    // Set up comprehensive event handlers for the audio element
    audio.onended = () => {
      const chunkId = audio.dataset.chunkId || getCurrentPlayingChunkId(audio.src) || 'unknown';
      debugLog(`[Chunk ${chunkId}] Audio playback ended naturally`);
      
      // Clear any existing safety timeout
      if (audio.safetyTimeoutId) {
        clearTimeout(audio.safetyTimeoutId);
        audio.safetyTimeoutId = null;
      }
      
      // Check if we're still in an active playback state
      if (!isPlayingRef.current) {
        debugLog(`[Chunk ${chunkId}] isPlayingRef is false, not proceeding with next chunk`);
        return;
      }
      
      // Check if we have more chunks to play
      if (pendingChunksRef.current.length > 0) {
        debugLog(`[Chunk ${chunkId}] We have ${pendingChunksRef.current.length} chunks left to play`);
        
        // Force a slight delay before moving to next chunk
        // This is critical for reliable sequential playback
        setTimeout(() => {
          debugLog(`[Chunk ${chunkId}] Moving to next chunk after natural end`);
          handleNextChunk(audio);
        }, 50); // Small delay to allow browser to update state
      } else {
        debugLog(`[Chunk ${chunkId}] No more chunks in queue after natural end`);
        
        // If processing is complete, reset processing state
        if (isProcessingCompleteRef.current) {
          debugLog(`[Chunk ${chunkId}] Processing is complete, resetting state`);
          updateIsProcessing(false);
          isProcessingCompleteRef.current = false;
        }
        
        // Complete playback
        setTimeout(() => {
          handlePlaybackComplete();
        }, 50);
      }
    };
    
    audio.onerror = (e) => {
      const error = e.target.error;
      const chunkId = audio.dataset.chunkId || getCurrentPlayingChunkId(audio.src) || 'unknown';
      debugLog(`[Chunk ${chunkId}] Audio playback error: ${error ? error.code : 'unknown'}`);
      
      // Clear any existing safety timeout
      if (audio.safetyTimeoutId) {
        clearTimeout(audio.safetyTimeoutId);
        audio.safetyTimeoutId = null;
      }
      
      // Force advancement to next chunk
      if (isPlayingRef.current && pendingChunksRef.current.length > 0) {
        debugLog(`[Chunk ${chunkId}] Advancing to next chunk after error`);
        setTimeout(() => {
          handleNextChunk(audio);
        }, 50);
      } else {
        debugLog(`[Chunk ${chunkId}] No more chunks to play after error`);
        handlePlaybackComplete();
      }
    };
    
    audio.onpause = () => {
      const chunkId = audio.dataset.chunkId || getCurrentPlayingChunkId(audio.src) || 'unknown';
      debugLog(`[Chunk ${chunkId}] Audio playback paused`);
    };
    
    audio.onplay = () => {
      const chunkId = audio.dataset.chunkId || getCurrentPlayingChunkId(audio.src) || 'unknown';
      debugLog(`[Chunk ${chunkId}] Audio playback started`);
      
      // Clear any existing safety timeout first
      if (audio.safetyTimeoutId) {
        clearTimeout(audio.safetyTimeoutId);
        audio.safetyTimeoutId = null;
      }
    };
    
    // Additional event to help with debugging playback issues
    audio.addEventListener('waiting', () => {
      const chunkId = audio.dataset.chunkId || getCurrentPlayingChunkId(audio.src) || 'unknown';
      debugLog(`[Chunk ${chunkId}] Audio playback waiting for more data`);
    });
    
    return audio;
  };
  
  // Function to connect an audio element to the analyzer
  const connectAudioToAnalyzer = (audio) => {
    if (!audio || !audioContextRef.current) return;
    
    try {
      // Output debug info about audio state
      debugLog(`Connecting audio to analyzer. Audio state: src=${!!audio.src}, preload=${audio.preload}, readyState=${audio.readyState}`);
      
      // Create an audio source from the HTML Audio element
      const mediaSource = audioContextRef.current.createMediaElementSource(audio);
      
      // Create an analyzer if it doesn't exist yet
      if (!audioAnalyserRef.current) {
        audioAnalyserRef.current = audioContextRef.current.createAnalyser();
        audioAnalyserRef.current.fftSize = 256;
      }
      
      // Connect the source to the analyzer and then to the destination
      mediaSource.connect(audioAnalyserRef.current);
      audioAnalyserRef.current.connect(audioContextRef.current.destination);
      
      debugLog('Connected audio element to analyzer for visualization');
      return true;
    } catch (err) {
      debugLog('Error connecting audio element to analyzer:', err);
      return false;
    }
  };
  
  // Function to ensure the audio element is connected to the analyzer
  const ensureAudioElementConnected = () => {
    if (!audioBuffersRef.current.audio) return false;
    
    // Check if we already have the right media source
    // We can't directly check for this, so we'll create a new connection
    // The browser will handle the connection appropriately
    if (audioContextRef.current && audioAnalyserRef.current) {
      try {
        const mediaSource = audioContextRef.current.createMediaElementSource(audioBuffersRef.current.audio);
        mediaSource.connect(audioAnalyserRef.current);
        debugLog('Reconnected audio element to analyzer');
        return true;
      } catch (err) {
        // This error is expected if the media element is already connected
        // We can safely ignore it
        debugLog('Audio element already connected to context:', err.message);
        return true;
      }
    }
    
    return false;
  };
  
  // Handle playing the next chunk from the queue
  const handleNextChunk = (audioElement) => {
    // Track the current chunk ID for better debugging
    const currentChunkId = audioElement.dataset.chunkId || getCurrentPlayingChunkId(audioElement.src) || 'unknown';
    debugLog(`[Chunk ${currentChunkId}] Handling next chunk`);

    // Clear safety timeout if it exists
    if (audioElement.safetyTimeoutId) {
      clearTimeout(audioElement.safetyTimeoutId);
      audioElement.safetyTimeoutId = null;
    }

    // Clear audio source to release memory
    if (audioElement.src) {
      try {
        URL.revokeObjectURL(audioElement.src);
      } catch (e) {
        debugLog(`[Chunk ${currentChunkId}] Error revoking URL:`, e);
      }
      audioElement.removeAttribute('src');
    }

    // Critical: Set isPlayingRef to true if we have chunks to play
    // This ensures playback chain doesn't break between chunks
    if (pendingChunksRef.current.length > 0) {
      isPlayingRef.current = true;
    }

    // Check if we're in the middle of cleanup or if playback was manually stopped
    if (!isPlayingRef.current) {
      debugLog(`[Chunk ${currentChunkId}] Not playing more chunks because isPlayingRef is false`);
      
      // If we have pending chunks but playback was stopped, log this unusual state
      if (pendingChunksRef.current.length > 0) {
        debugLog(`[Chunk ${currentChunkId}] WARNING: ${pendingChunksRef.current.length} chunks left in queue but playback was stopped`);
      }
      
      return;
    }

    // Check if there are more chunks to play
    if (pendingChunksRef.current.length > 0) {
      const nextChunk = pendingChunksRef.current.shift();
      debugLog(`[Chunk ${currentChunkId}] Playing next chunk (ID: ${nextChunk.id}). ${pendingChunksRef.current.length} chunks remaining`);
      
      // Set the source and metadata
      audioElement.src = nextChunk.url;
      audioElement.dataset.chunkId = nextChunk.id;
      
      // Set a watchdog timer for this chunk
      setChunkWatchdog(audioElement, nextChunk.id);
      
      const onMetadataLoaded = () => {
        debugLog(`[Chunk ${nextChunk.id}] Metadata loaded, duration: ${audioElement.duration}s`);
        
        // Update the watchdog based on actual duration if available
        if (audioElement.duration && isFinite(audioElement.duration)) {
          setChunkWatchdog(audioElement, nextChunk.id, audioElement.duration);
        }
        
        audioElement.removeEventListener('loadedmetadata', onMetadataLoaded);
      };
      
      audioElement.addEventListener('loadedmetadata', onMetadataLoaded);
      
      const canPlayThroughHandler = () => {
        debugLog(`[Chunk ${nextChunk.id}] Can play through, starting playback`);
        audioElement.removeEventListener('canplaythrough', canPlayThroughHandler);
        
        const playNextAudio = async () => {
          try {
            await audioElement.play();
            markChunkAsPlayed(nextChunk.id);
            debugLog(`[Chunk ${nextChunk.id}] Started playing`);
            
            // Monitor playback state with a watchdog timer if the ended event doesn't fire
            const checkInterval = setInterval(() => {
              // Check if player is in ended state
              if (audioElement.ended) {
                clearInterval(checkInterval);
                debugLog(`[Chunk ${nextChunk.id}] Detected ended state in interval check`);
                
                // If we have more chunks, move to next one
                if (pendingChunksRef.current.length > 0) {
                  debugLog(`[Chunk ${nextChunk.id}] Moving to next chunk after detecting ended state`);
                  handleNextChunk(audioElement);
                } else {
                  debugLog(`[Chunk ${nextChunk.id}] No more chunks, completing playback`);
                  handlePlaybackComplete();
                }
              }
            }, 250); // Check every 250ms
            
            // Cleanup the interval when audio actually ends
            audioElement.addEventListener('ended', () => {
              clearInterval(checkInterval);
            }, { once: true });
            
          } catch (e) {
            debugLog(`[Chunk ${nextChunk.id}] Error playing audio:`, e);
            
            // If play fails, still try to continue to the next chunk
            // Force a small delay to avoid potential rapid errors
            setTimeout(() => {
              handleNextChunk(audioElement);
            }, 100);
          }
        };
        
        playNextAudio();
      };
      
      audioElement.addEventListener('canplaythrough', canPlayThroughHandler);
      
    } else {
      // No more chunks to play
      debugLog(`[Chunk ${currentChunkId}] No more chunks in queue, playback complete`);
      
      // Reset playing state
      isPlayingRef.current = false;
      
      // Trigger playback complete handler
      handlePlaybackComplete();
    }
    
    // If processing is complete, reset processing state
    if (isProcessingCompleteRef.current && !isPlayingRef.current) {
      debugLog('Processing is complete and playback is done, resetting state');
      updateIsProcessing(false);
      isProcessingCompleteRef.current = false;
    }
  };

  // Function to log a summary of chunk processing
  const debugChunkSummary = () => {
    const chunks = allAudioChunksMetaRef.current;
    debugLog(`--- CHUNK PLAYBACK SUMMARY ---`);
    debugLog(`Total chunks: ${chunks.length}`);
    
    const playedChunks = chunks.filter(c => c.played);
    debugLog(`Played chunks: ${playedChunks.length}/${chunks.length}`);
    
    const unplayedChunks = chunks.filter(c => !c.played);
    if (unplayedChunks.length > 0) {
      debugLog(`Unplayed chunks: ${unplayedChunks.length}`);
      unplayedChunks.forEach(c => {
        debugLog(`  Chunk ${c.id}: size ${c.size} bytes, created at ${new Date(c.timestamp).toISOString()}`);
      });
    }
    
    debugLog(`-----------------------------`);
  };

  // Function to mark a chunk as played in our metadata
  const markChunkAsPlayed = (chunkId) => {
    const chunk = allAudioChunksMetaRef.current.find(c => c.id === chunkId);
    if (chunk) {
      chunk.played = true;
      chunk.playedAt = Date.now();
      debugLog(`[Chunk ${chunkId}] Marked as played`);
    }
  };

  // Function to get the current playing chunk ID from a src URL
  const getCurrentPlayingChunkId = (src) => {
    if (!src) return 'unknown';
    
    // Try to find the chunk by URL
    const chunk = allAudioChunksMetaRef.current.find(c => c.url === src);
    if (chunk) return chunk.id;
    
    // If not found, extract just the last part of the blob URL for logging
    const urlParts = src.split('/');
    return urlParts[urlParts.length - 1] || 'unknown';
  };
  
  return (
    <div className="streaming-voice-interface-container">
      <Card className="streaming-voice-interface">
        {/* Remove debug button */}
        
        {/* Remove small indicator for auto-send status */}

        {/* Auto-Send Settings Button - Will be moved to navbar but keep in component for now */}
        <div className="auto-send-settings-button">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            title="Voice Settings"
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
              
              <hr className="settings-divider" />
              
              <Form.Group className="mb-3">
                <Form.Check 
                  type="switch"
                  id="show-transcription-switch"
                  label={<strong>Show Transcription</strong>}
                  checked={showTranscription}
                  onChange={(e) => toggleTranscription(e.target.checked)}
                />
                <Form.Text className="text-muted">
                  Display transcription container
                </Form.Text>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Check 
                  type="switch"
                  id="show-ai-response-switch"
                  label={<strong>Show AI Response</strong>}
                  checked={showAiResponse}
                  onChange={(e) => toggleAiResponse(e.target.checked)}
                />
                <Form.Text className="text-muted">
                  Display AI response container
                </Form.Text>
              </Form.Group>
              
              <hr className="settings-divider" />
              
              <Form.Group className="mb-3">
                <Form.Label className="fw-medium">
                  <strong>Visualization Style</strong>
                </Form.Label>
                <div className="d-flex gap-2 justify-content-center mt-2">
                  <Button 
                    variant={visualizationMode === 'bars' ? 'primary' : 'outline-primary'} 
                    size="sm"
                    onClick={() => updateVisualizationMode('bars')}
                    className="viz-toggle-btn"
                  >
                    Bars
                  </Button>
                  <Button 
                    variant={visualizationMode === 'circle' ? 'primary' : 'outline-primary'} 
                    size="sm"
                    onClick={() => updateVisualizationMode('circle')}
                    className="viz-toggle-btn"
                  >
                    Circle
                  </Button>
                  <Button 
                    variant={visualizationMode === 'wave' ? 'primary' : 'outline-primary'} 
                    size="sm"
                    onClick={() => updateVisualizationMode('wave')}
                    className="viz-toggle-btn"
                  >
                    Wave
                  </Button>
                </div>
              </Form.Group>
            </Form>
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
          <Card.Body className="d-flex flex-column align-items-center justify-content-center">
            {/* Connection status indicators */}
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
          
            {/* Voice Visualization - Add this above the controls */}
            <div 
              className={`voice-visualization-container ${isRecording ? 'recording' : ''} ${isPlaying ? 'playing' : ''}`}
            >
              <VoiceVisualization 
                isRecording={isRecording}
                isPlaying={isPlaying}
                audioAnalyserRef={audioAnalyserRef}
                currentAudioLevel={currentAudioLevel}
                mode={visualizationMode}
              />
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
            
            {/* No speech detected alert */}
            {noSpeechDetected && (
              <div className="error-container">
                <Alert 
                  variant="warning" 
                  className="error-message"
                  dismissible
                  onClose={handleDismissNoSpeech}
                >
                  No speech was detected in your recording. Please try again.
                </Alert>
              </div>
            )}
            
            {/* Controls based on state */}
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
              {/* Transcription display - only visible if enabled */}
              {showTranscription && (
                <div className="transcription-container">
                  {/* Always show current transcription */}
                  {transcription && !isFinalTranscript && (
                    <div className="transcription-text">
                      {/* Show accumulated transcripts first if they exist */}
                      {accumulatedTranscripts && (
                        <span className="final">{accumulatedTranscripts} </span>
                      )}
                      {/* Then show current non-final transcription */}
                      <span className="current">{transcription}</span>
                    </div>
                  )}

                  {/* If there's no active transcription but we have accumulated ones, show those */}
                  {(!transcription || isFinalTranscript) && accumulatedTranscripts && (
                    <div className="transcription-text final">
                      {accumulatedTranscripts}
                    </div>
                  )}

                  {/* If there's nothing to show */}
                  {!transcription && !accumulatedTranscripts && (
                    <div className="transcription-empty">
                      Your speech will appear here...
                    </div>
                  )}
                </div>
              )}
              
              {/* AI Response display - only visible if enabled */}
              {showAiResponse && (
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
              )}
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
          </Card.Body>
        )}
      </Card>
    </div>
  );
};

export default WebSocketVoice;