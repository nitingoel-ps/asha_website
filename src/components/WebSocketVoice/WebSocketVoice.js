import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Spinner, Alert } from 'react-bootstrap';
import { Mic, Square, X, Pause, Play, Keyboard, Send } from 'lucide-react';
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
  
  // Validation states
  const [showValidation, setShowValidation] = useState(false);
  const [validationPlaying, setValidationPlaying] = useState(false);
  
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
  const localRecordingChunksRef = useRef([]);
  
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
  const SILENCE_THRESHOLD = 3000; // 3 seconds
  const MAX_RECORDING_DURATION = 30000; // 30 seconds
  const silenceDetectionIntervalRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  
  // Add a chunk counter reference at the top of the component
  const chunkCounterRef = useRef(0);
  
  // Connection status
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine ? 'online' : 'offline');

  
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
          setIsProcessing(true);
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
          handleAudioChunk(message);
          break;
          
        case 'processing_complete':
          debugLog('Server signaled processing complete');
          setIsProcessing(false);
          handlePlaybackComplete();
          break;
          
        case 'error':
          debugLog(`Server error: ${message.message}`);
          setError(message.message);
          setIsProcessing(false);
          stopRecording();
          break;
          
        case 'cancelled':
          debugLog('Server cancelled processing');
          setIsProcessing(false);
          stopRecording();
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
      if (isProcessing && !isPlaying) {
        debugLog('First audio chunk received, transitioning from processing to playback');
      }
      
      // Update text transcription
      if (message.text) {
        debugLog(`Updating transcription with: "${message.text}"`);
        setTranscription(prev => prev + " " + message.text);
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
  
  // Play audio chunks as they arrive
  const queueAndPlayAudio = async (arrayBuffer) => {
    try {
      if (!audioContextRef.current) {
        await initializeAudioContext();
      }
      
      // Create an audio element to play the chunk directly
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Store this URL in our complete list for potential replay from beginning
      allAudioChunksUrlsRef.current.push(audioUrl);
      
      if (!audioBuffersRef.current.audio) {
        const audio = new Audio();
        audio.onended = () => {
          // Clean up the URL when done
          URL.revokeObjectURL(audioUrl);
          
          // Play next chunk if available
          if (pendingChunksRef.current.length > 0) {
            const nextChunkUrl = pendingChunksRef.current.shift();
            audioBuffersRef.current.audio.src = nextChunkUrl;
            audioBuffersRef.current.audio.play().catch(e => debugLog('Error playing next chunk:', e));
          } else {
            isPlayingRef.current = false;
            if (pendingChunksRef.current.length === 0 && !isProcessing) {
              handlePlaybackComplete();
            }
          }
        };
        
        audio.onerror = (e) => {
          debugLog('Audio playback error:', e);
          URL.revokeObjectURL(audioUrl);
          
          // Try next chunk
          if (pendingChunksRef.current.length > 0) {
            const nextChunkUrl = pendingChunksRef.current.shift();
            audio.src = nextChunkUrl;
            audio.play().catch(e => debugLog('Error playing next chunk:', e));
          } else {
            isPlayingRef.current = false;
          }
        };
        
        audioBuffersRef.current.audio = audio;
      }
      
      // If we're currently playing, queue this chunk
      if (isPlayingRef.current) {
        pendingChunksRef.current.push(audioUrl);
      } else {
        // Otherwise play it immediately
        isPlayingRef.current = true;
        audioBuffersRef.current.audio.src = audioUrl;
        
        // Use the same user interaction context for playback
        if (userInteractionContextRef.current) {
          await audioBuffersRef.current.audio.play().catch(e => {
            debugLog('Error starting audio playback:', e);
            // Set autoplay failed flags
            autoplayFailedRef.current = true;
            setAutoplayFailed(true);
            isPlayingRef.current = false;
          });
        } else {
          // If we don't have user interaction context, mark as failed
          autoplayFailedRef.current = true;
          setAutoplayFailed(true);
          isPlayingRef.current = false;
        }
      }
      
      // Update UI state only if autoplay hasn't failed
      if (!autoplayFailedRef.current) {
        if (!isPlaying) {
          setIsPlaying(true);
        }
      }
      
    } catch (error) {
      debugLog('Error queuing audio:', error);
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
    if (audioBuffersRef.current.audio) {
      audioBuffersRef.current.audio.pause();
      audioBuffersRef.current.audio.src = '';
    }
    
    // Clean up any pending URLs
    pendingChunksRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    
    pendingChunksRef.current = [];
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
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
    debugLog('Playback completed');
    isPlaybackCompleteRef.current = true;
    
    // Don't auto cleanup if we're in autoplay failed state
    if (!autoplayFailedRef.current) {
      setTimeout(() => cleanupAudio(false), 100);
    }
  };
  
  const cleanupAudio = (preserveForReplay = false) => {
    try {
      // Don't cleanup if we're in autoplay failed state unless explicitly stopping
      if (autoplayFailedRef.current && preserveForReplay) {
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
            // Ignore cleanup errors
          }
        });
        allAudioChunksUrlsRef.current = [];
        
        // Reset states
        isPlaybackCompleteRef.current = false;
        setAutoplayFailed(false);
        autoplayFailedRef.current = false;
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
      localRecordingChunksRef.current = [];
      chunkCounterRef.current = 0;
      
      // Set up a user interaction context for audio playback
      userInteractionContextRef.current = true;
      
      // Handle data available from recorder
      recorder.ondataavailable = async (event) => {
        if (!event.data || event.data.size === 0) {
          debugLog('No audio data received');
          return;
        }
        
        const chunkNum = ++chunkCounterRef.current;
        const chunkTime = new Date().toISOString();
        const chunkSize = event.data.size;
        
        debugLog(`[CHUNK ${chunkNum}] Received audio data at ${chunkTime}, size: ${chunkSize} bytes, type: ${event.data.type}`);
        
        // Store a copy of the chunk for local validation
        localRecordingChunksRef.current.push(event.data);
        
        try {
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
          
          // If average volume is above threshold, update last activity time
          if (average > 10) {  // Threshold for silence (adjust as needed)
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
      
      // Send the stream if silence threshold is reached
      if (timeSinceLastActivity >= SILENCE_THRESHOLD) {
        debugLog(`Silence detected for ${timeSinceLastActivity}ms - stopping recording`);
        stopRecording(true);
      }
      
      // Also check for max duration
      const recordingDuration = now - recordingStartTimeRef.current;
      if (recordingDuration >= MAX_RECORDING_DURATION) {
        debugLog(`Maximum recording duration reached (${MAX_RECORDING_DURATION}ms)`);
        stopRecording(true);
      }
    }, 500);
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
    debugLog(`Stopping recording, sendEndStream=${sendEndStream}`);
    
    // Stop silence detection
    clearSilenceDetection();
    
    // Stop the MediaRecorder if it exists and is recording
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        debugLog('Stopping MediaRecorder');
        recorderRef.current.stop();
        recorderRef.current = null;
      } catch (e) {
        debugLog('Error stopping recorderRef:', e);
      }
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        debugLog('Stopping mediaRecorderRef');
        mediaRecorderRef.current.stop();
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
    
    // Send end_stream message if required
    if (sendEndStream && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      debugLog('Sending end_stream message to server');
      socketRef.current.send(JSON.stringify({
        type: 'end_stream'
      }));
      
      // Update UI to show processing state
      setIsProcessing(true);
    }
    
    // Update recording state
    setIsRecording(false);
    isRecordingRef.current = false;
    mediaRecorderRef.current = null;
  };
  
  // Cancel recording
  const handleCancel = () => {
    debugLog('User clicked Cancel button');
    
    // Send cancel message to server
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      debugLog('Sending cancel message to server');
      socketRef.current.send(JSON.stringify({
        type: 'cancel'
      }));
    }
    
    // Stop recording without sending end_stream
    stopRecording(false);
    
    // Reset all states
    setIsProcessing(false);
    setTranscription('');
    setIsFinalTranscript(false);
    
    // Clean up any audio playback
    cleanupAudio();
    
    // Clear local recording chunks
    localRecordingChunksRef.current = [];
    
    debugLog('Recording cancelled');
  };
  
  // Explicit send function
  const handleSend = () => {
    if (isRecording) {
      debugLog('User clicked Send button - ending recording and stream');
      
      // First stop the recorder
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        debugLog('Stopping MediaRecorder');
        recorderRef.current.stop();
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
      
      // Send end_stream message to server
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        debugLog('Sending end_stream message to server');
        socketRef.current.send(JSON.stringify({
          type: 'end_stream'
        }));
        
        // Update UI to show processing state
        setIsProcessing(true);
        setIsRecording(false);
        isRecordingRef.current = false;
        
        // Show validation option if we have local chunks
        if (localRecordingChunksRef.current.length > 0) {
          setShowValidation(true);
        }
        
        debugLog('Entered processing state, awaiting server response');
      } else {
        debugLog('WebSocket not connected, cannot send end_stream message');
        setError('Connection lost. Could not send message to server.');
        setIsRecording(false);
        isRecordingRef.current = false;
        
        // Still allow validation even if we couldn't send
        if (localRecordingChunksRef.current.length > 0) {
          setShowValidation(true);
        }
      }
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
  }, [connectionStatus, isConnected, isConnecting]);
  
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
  
  // Function to play back recorded audio locally
  const playLocalRecording = () => {
    if (localRecordingChunksRef.current.length === 0) {
      debugLog('No local recording chunks available');
      return;
    }
    
    try {
      // Create a combined blob from all chunks
      const recordedBlob = new Blob(localRecordingChunksRef.current, { type: 'audio/webm' });
      debugLog(`Local recording size: ${recordedBlob.size} bytes`);
      
      if (recordedBlob.size === 0) {
        setError('No audio recorded. The microphone might not be working properly.');
        return;
      }
      
      // Create audio element for playback
      const audioURL = URL.createObjectURL(recordedBlob);
      const audio = new Audio(audioURL);
      
      audio.onended = () => {
        debugLog('Local recording playback ended');
        setValidationPlaying(false);
        URL.revokeObjectURL(audioURL);
      };
      
      audio.onerror = (e) => {
        debugLog('Error playing local recording:', e);
        setValidationPlaying(false);
        URL.revokeObjectURL(audioURL);
        setError('Could not play back recorded audio for validation.');
      };
      
      audio.play().then(() => {
        debugLog('Playing local recording for validation');
        setValidationPlaying(true);
      }).catch(e => {
        debugLog('Failed to play local recording:', e);
        setError('Could not play back recorded audio. Browser may have autoplay restrictions.');
      });
    } catch (error) {
      debugLog('Error creating playback for local recording:', error);
      setError(`Playback error: ${error.message}`);
    }
  };
  
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
- Local Chunks: ${localRecordingChunksRef.current.length}
- Network: ${networkStatus}
- Auth Token: ${localStorage.getItem('access_token') ? 'Present' : 'Missing'}
              `;
              alert(connectionDetails);
            }}
          >
            Debug
          </Button>
        </div>

        {/* Connection status indicator */}
        <div className="connection-status">
          <span className={`status-indicator ${isWebSocketConnected() ? 'connected' : (socketRef.current && socketRef.current.readyState === WebSocket.CONNECTING ? 'connecting' : 'disconnected')}`}></span>
          <span className="status-text">
            {isWebSocketConnected() ? 'Connected' : (socketRef.current && socketRef.current.readyState === WebSocket.CONNECTING ? 'Connecting...' : 'Disconnected')}
          </span>
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
            {/* Transcription display */}
            {transcription && (
              <div className="transcription-container">
                <div className={`transcription-text ${isFinalTranscript ? 'final' : ''}`}>
                  {transcription}
                </div>
              </div>
            )}

            {/* Controls based on state */}
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
            {isConnected && !isRecording && !isProcessing && !isPlaying && !isPaused && !autoplayFailed && (
              <div className="voice-controls">
                <Button
                  className="record-button"
                  variant="primary"
                  onClick={startRecording}
                  disabled={!isConnected || isRecording}
                >
                  <Mic size={20} />
                  Click to speak
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
                    variant="primary"
                    onClick={handleSend}
                  >
                    <Send size={16} />
                    Send
                  </Button>
                  <Button
                    className="cancel-button"
                    variant="outline-secondary"
                    onClick={handleCancel}
                  >
                    <X size={16} />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && !isPlaying && !isPaused && !autoplayFailed && (
              <div className="streaming-indicator">
                <Spinner animation="border" size="sm" />
                Processing...
              </div>
            )}

            {/* Playback controls */}
            {isPlaying && (
              <div className="playback-controls">
                <Button
                  variant="outline-primary"
                  onClick={pausePlayback}
                >
                  <Pause size={20} />
                  Pause
                </Button>
              </div>
            )}

            {isPaused && (
              <div className="playback-controls">
                <Button
                  variant="outline-primary"
                  onClick={resumePlayback}
                >
                  <Play size={20} />
                  Resume
                </Button>
              </div>
            )}

            {/* Autoplay failed message */}
            {autoplayFailed && (
              <Alert variant="info" className="autoplay-warning">
                <p>Autoplay was blocked by your browser.</p>
                <Button
                  className="play-button"
                  variant="primary"
                  onClick={startManualPlayback}
                >
                  <Play size={16} />
                  Play Response
                </Button>
              </Alert>
            )}

            {/* Validation controls */}
            {isProcessing && showValidation && !isPlaying && !isPaused && !autoplayFailed && (
              <div className="validation-controls">
                <Button 
                  variant="outline-info" 
                  className="validation-button"
                  onClick={playLocalRecording}
                  disabled={validationPlaying}
                >
                  {validationPlaying ? 'Playing...' : 'Validate Recording'}
                </Button>
                <div className="validation-hint">
                  Click to hear what was recorded
                </div>
              </div>
            )}

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