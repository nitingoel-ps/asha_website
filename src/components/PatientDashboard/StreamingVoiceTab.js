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
  const [canPlay, setCanPlay] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [responseUrl, setResponseUrl] = useState(null);
  const [mobileBlob, setMobileBlob] = useState(null); // Add state for storing the mobile audio blob
  const [mobilePlaybackError, setMobilePlaybackError] = useState(null); // Track mobile-specific errors

  // Add new ref for synchronous stream state tracking
  const isStreamCompleteRef = useRef(false);

  // Update state definition to use ref initial value
  const [isStreamComplete, setIsStreamComplete] = useState(false);

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

  // Add a new ref to track the last time we received audio data
  const lastAudioUpdateRef = useRef(Date.now());
  const playbackTimeoutRef = useRef(null);

  // Add new state to track audio initialization
  const [audioInitialized, setAudioInitialized] = useState(false);
  const mobileAudioUrlRef = useRef(null);

  useEffect(() => {
    // Initialize AudioContext
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Add effect to monitor stream completion state changes
  useEffect(() => {
    console.log('Stream completion state changed:', {
      isStreamComplete,
      refValue: isStreamCompleteRef.current
    });
  }, [isStreamComplete]);

  // Update setupMediaSource to better handle playback completion
  const setupMediaSource = () => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.autoplay = true;
      const mediaSource = new MediaSource();
      
      // Update timeupdate handler to detect stalled playback
      audio.addEventListener('timeupdate', () => {
        lastAudioUpdateRef.current = Date.now(); // Update timestamp during active playback
        
        console.log('Desktop Audio timeupdate:', {
          currentTime: audio.currentTime,
          timeSinceLastUpdate: Date.now() - lastAudioUpdateRef.current,
          isStreamComplete
        });
      });

      // Still keep the ended event as backup
      audio.addEventListener('ended', () => {
        console.log('Desktop Audio playback COMPLETED via ended event');
        cleanupStates(true);
      });

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

  // First, improve the waitForUpdateEnd function to handle multiple source buffers
  const waitForUpdateEnd = () => {
    return new Promise((resolve) => {
      const checkUpdate = () => {
        if (!sourceBufferRef.current || !sourceBufferRef.current.updating) {
          resolve();
          return;
        }
        
        // Check again in a few milliseconds
        setTimeout(checkUpdate, 50);
      };
      
      checkUpdate();
    });
  };

  // Update endMediaStream to handle the case when buffer is still updating
  const endMediaStream = async () => {
    console.log('In endMediaStream');
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 10; // Try for about 1 second total

      const checkAndEnd = async () => {
        if (attempts >= maxAttempts) {
          console.warn('Could not end media stream after maximum attempts');
          setIsStreamComplete(true);
          // Don't cleanup states here, let the playback completion detection handle it
          resolve();
          return;
        }

        attempts++;

        if (!mediaSourceRef.current || mediaSourceRef.current.readyState !== 'open') {
          setIsStreamComplete(true);
          cleanupStates(false); // Don't cleanup playback states
          resolve();
          return;
        }

        if (sourceBufferRef.current?.updating) {
          // Still updating, check again in a bit
          setTimeout(checkAndEnd, 100);
          return;
        }

        try {
          mediaSourceRef.current.endOfStream();
          setIsStreamComplete(true);
          cleanupStates(false); // Don't cleanup playback states
        } catch (error) {
          console.warn('Non-critical: Could not end media stream', error);
          setIsStreamComplete(true);
          cleanupStates(false); // Don't cleanup playback states
        }
        resolve();
      };

      checkAndEnd();
    });
  };

  const cleanupStates = (includePlayback = true) => {
    console.log('Cleaning up states:', {
      includePlayback,
      currentStates: {
        isPlaying,
        isPaused,
        isProcessing,
        canPlay
      }
    });

    if (includePlayback) {
      setIsPlaying(false);
      setIsPaused(false);
      isPlayingRef.current = false;
    }
    setIsProcessing(false);
    setCanPlay(false);
  };

  // Add stream state reset to cleanupAudio
  // Update cleanupAudio to reset both state and ref
  const cleanupAudio = () => {
    console.log('Cleaning up audio resources');
    
    // Reset both state and ref
    isStreamCompleteRef.current = false;
    setIsStreamComplete(false);
    lastAudioUpdateRef.current = Date.now();
    
    // Clear playback timeout
    if (playbackTimeoutRef.current) {
      clearInterval(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }

    // Handle audio element cleanup safely
    try {
      if (audioElementRef.current) {
        console.log('Stopping and cleaning audio element');
        
        // Save reference to current audio element to clean it up properly
        const audioElement = audioElementRef.current;
        
        // Remove all event listeners to prevent memory leaks
        const cloneAudio = audioElement.cloneNode(false);
        
        // Pause and reset the audio
        audioElement.onended = null;
        audioElement.onerror = null;
        audioElement.onplay = null;
        audioElement.onpause = null;
        audioElement.oncanplaythrough = null;
        audioElement.ontimeupdate = null;
        audioElement.pause();
        audioElement.src = '';
        audioElement.load(); // Force reload to clear buffers
        
        if (audioElement.parentNode) {
          audioElement.parentNode.replaceChild(cloneAudio, audioElement);
        }
        
        // Nullify the reference
        audioElementRef.current = null;
      }
    } catch (error) {
      console.warn('Error cleaning up audio element:', error);
    }
    
    // Clean up mobile blob URL safely
    try {
      if (mobileAudioUrlRef.current) {
        URL.revokeObjectURL(mobileAudioUrlRef.current);
        mobileAudioUrlRef.current = null;
      }
      
      // Clean up general response URL
      if (responseUrl) {
        URL.revokeObjectURL(responseUrl);
        setResponseUrl(null);
      }
    } catch (error) {
      console.warn('Error revoking blob URL:', error);
    }
    
    // Clean up media source safely
    try {
      if (mediaSourceRef.current) {
        if (mediaSourceRef.current.readyState === 'open') {
          try {
            mediaSourceRef.current.endOfStream();
          } catch (e) {
            console.warn('Could not end media stream:', e);
          }
        }
        mediaSourceRef.current = null;
      }
      
      // Clear source buffer
      if (sourceBufferRef.current) {
        sourceBufferRef.current = null;
      }
    } catch (error) {
      console.warn('Error cleaning up media source:', error);
    }
    
    // Clean up mobile blob
    setMobileBlob(null);
    setMobilePlaybackError(null);
    
    // Clear audio buffers
    audioBuffersRef.current = [];
    pendingChunksRef.current = [];
    isSourceOpenRef.current = false;
    
    // Reset audio initialization state
    setAudioInitialized(false);
    
    console.log('Audio buffers cleared');
  };

  // Add markStreamComplete function
  const markStreamComplete = () => {
    console.log('Marking stream as complete');
    isStreamCompleteRef.current = true;
    setIsStreamComplete(true);
  };

  // Improved createSafeBlobUrl to store reference to mobile URLs
  const createSafeBlobUrl = (blob, isMobileUrl = false) => {
    try {
      // Clean up existing URLs based on type
      if (isMobileUrl && mobileAudioUrlRef.current) {
        URL.revokeObjectURL(mobileAudioUrlRef.current);
        mobileAudioUrlRef.current = null;
      } else if (responseUrl) {
        URL.revokeObjectURL(responseUrl);
      }
      
      // Create and return new URL
      const url = URL.createObjectURL(blob);
      
      // Store mobile URL reference if needed
      if (isMobileUrl) {
        mobileAudioUrlRef.current = url;
      }
      
      return url;
    } catch (error) {
      console.error('Error creating blob URL:', error);
      return null;
    }
  };

  // Add function to check for playback completion
  const checkPlaybackCompletion = () => {
    const audio = audioElementRef.current;
    if (!audio) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - lastAudioUpdateRef.current;
    
    console.log('Checking playback completion:', {
      currentTime: audio.currentTime,
      timeSinceLastUpdate,
      isStreamComplete: isStreamComplete,
      isStreamCompleteRef: isStreamCompleteRef.current,
      isPlaying,
      lastUpdateTime: new Date(lastAudioUpdateRef.current).toISOString()
    });

    // Consider playback complete if:
    // 1. We haven't received new data for 2 seconds
    if (timeSinceLastUpdate > 2000) {
      console.log('Detected playback completion via timeout');
      cleanupStates(true);
      
      // Clear the interval since we're done
      if (playbackTimeoutRef.current) {
        clearInterval(playbackTimeoutRef.current);
        playbackTimeoutRef.current = null;
      }
    }
  };

  // Update handleAudioChunk for mobile playback
  const handleAudioChunk = async (arrayBuffer, isFirstChunk = false) => {
    lastAudioUpdateRef.current = Date.now(); // Update timestamp when we receive new data
    
    console.log(`Handling audio chunk, isFirstChunk: ${isFirstChunk}, size: ${arrayBuffer.byteLength}`);
    if (isMobile) {
      // For mobile, we'll collect all chunks and play at the end
      audioBuffersRef.current.push(arrayBuffer);
      console.log(`Mobile: Added chunk to buffer, total chunks: ${audioBuffersRef.current.length}`);
      
      // Don't try to play incrementally on mobile
      if (isFirstChunk) {
        console.log('Mobile: First chunk received');
        setCanPlay(false); // Don't enable play button until we have the complete response
      }
    } else {
      // Desktop handling remains the same
      await appendChunkToSourceBuffer(arrayBuffer);
      // Set isPlaying to true when we start receiving chunks
      if (isFirstChunk) {
        setIsPlaying(true);
        setIsProcessing(false);  // Stop showing processing indicator
        
        // Start checking for completion
        if (playbackTimeoutRef.current) {
          clearInterval(playbackTimeoutRef.current);
        }
        playbackTimeoutRef.current = setInterval(checkPlaybackCompletion, 1000);
      }
    }
  };

  // Update handleAudioStream to handle mobile differently
  const handleAudioStream = async (response) => {
    console.log('Starting to handle audio stream');
    cleanupAudio(); // Clean up before starting new stream
    isStreamCompleteRef.current = false; // Reset ref
    setIsStreamComplete(false); // Reset state
    
    // Reset audio state
    audioBuffersRef.current = [];
    
    // Setup new audio playback (only for desktop)
    if (!isMobile) {
      await setupAudioPlayback();
    }
    
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
          console.log('Stream complete - all chunks received');
          markStreamComplete(); // Use new function
          lastAudioUpdateRef.current = Date.now(); // Reset the update time
          
          // For mobile, create the complete audio blob when done
          if (isMobile && audioBuffersRef.current.length > 0) {
            try {
              const completeBlob = new Blob(audioBuffersRef.current, { type: 'audio/mpeg' });
              setMobileBlob(completeBlob);
              
              // Create URL safely with isMobileUrl=true flag
              const url = createSafeBlobUrl(completeBlob, true);
              if (url) {
                setResponseUrl(url);
                setCanPlay(true);
                console.log('Mobile: Complete audio ready for playback', url);
              } else {
                throw new Error('Failed to create blob URL');
              }
            } catch (error) {
              console.error('Error creating mobile audio blob:', error);
              setError('Error preparing audio for playback');
            }
          } else if (!isMobile && mediaSourceRef.current?.readyState === 'open') {
            try {
              mediaSourceRef.current.endOfStream();
            } catch (error) {
              console.warn('Error calling endOfStream:', error);
            }
          }
          
          // Always mark processing as complete
          setIsProcessing(false);
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
              setIsStreamComplete(true);
              setIsProcessing(false);
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
          setIsStreamComplete(true);
          setIsProcessing(false);
        }
      }

      // After processing all chunks, mark stream as complete
      if (!isMobile) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await endMediaStream();
      }
    } catch (error) {
      // Update error handlers to use markStreamComplete
      if (error instanceof DOMException && error.name === 'InvalidStateError') {
        console.warn('Non-critical stream end error:', error);
        markStreamComplete();
        cleanupStates(false); // Don't cleanup playback states
      } else {
        console.error('Error processing audio stream:', error);
        setError('Error processing audio stream');
        markStreamComplete();
      }
      setIsProcessing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update startRecording to handle audio context resume and reset before recording
  const startRecording = async () => {
    console.log('Starting recording');
    setError(null); // Clear any existing errors first
    setMobilePlaybackError(null); // Clear mobile-specific errors
    
    // Ensure we clean up any existing audio resources
    try {
      // First stop playback if it's happening
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      
      // Then clean everything up
      cleanupAudio();
    } catch (err) {
      console.warn('Non-critical error cleaning up before recording:', err);
    }
    
    // Reset UI states
    setIsPlaying(false);
    setIsPaused(false);
    setCanPlay(false);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording');
      }

      // Ensure AudioContext is resumed for iOS Safari
      if (audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
          console.log('AudioContext resumed successfully');
        } catch (err) {
          console.warn('Could not resume AudioContext:', err);
          // Continue anyway, might still work
        }
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
          // Check if we have any audio data
          if (!audioChunksRef.current.length) {
            console.warn('No audio chunks recorded');
            setError('No audio was recorded. Please try again.');
            setIsProcessing(false);
            return;
          }
          
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: mediaRecorderRef.current.mimeType || 'audio/webm' 
          });

          // Convert blob to base64
          const base64Audio = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
          });

          setIsProcessing(true);
          const response = await fetchWithAuth('/streaming-voice-chat/', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              audio: base64Audio.split(',')[1],
              stream: true
            })
          });

          if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
          
          // Handle streaming response
          handleAudioStream(response);

        } catch (error) {
          console.error('Error processing recording:', error);
          setError('Error processing recording: ' + (error.message || 'Unknown error'));
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error: ' + (event.error?.message || 'Unknown error'));
        setIsRecording(false);
        setIsProcessing(false);
      };

      // Start recording with a short timeout to ensure everything is ready
      setTimeout(() => {
        try {
          mediaRecorderRef.current.start();
          setIsRecording(true);
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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Add a dedicated function to properly stop playback
  const stopPlayback = async () => {
    console.log('Stopping playback completely');
    
    // First pause any playing audio
    try {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    } catch (e) {
      console.warn('Error pausing audio element:', e);
    }
    
    // For mobile, we need to be extra careful
    if (isMobile) {
      try {
        // Create a clone of the audio element without event listeners
        if (audioElementRef.current) {
          const audio = audioElementRef.current;
          
          // Remove all event listeners explicitly
          audio.onended = null;
          audio.onerror = null;
          audio.onplay = null;
          audio.onpause = null;
          audio.oncanplaythrough = null;
          audio.ontimeupdate = null;
          
          // Clear source and force a load to clean the buffer
          audio.src = '';
          audio.load();
        }
      } catch (error) {
        console.warn('Non-critical error while stopping mobile playback:', error);
      }
    }
    
    // Clean up additional resources
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
      } catch (e) {
        console.warn('Error stopping audio source:', e);
      }
    }
    
    // Clear queued audio
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    // Reset UI states first
    setIsPlaying(false);
    setIsPaused(false);
    setCanPlay(true); // Keep the ability to play again
    
    // No need to clean everything here - we might want to play again
    // Just ensure we have reference to the blob for replay
    if (mobileBlob) {
      // Make sure we have a valid URL for replay
      if (!mobileAudioUrlRef.current) {
        try {
          const url = createSafeBlobUrl(mobileBlob, true);
          console.log('Created new URL for replay:', url);
        } catch (e) {
          console.warn('Error creating URL for replay:', e);
        }
      }
    }
  };

  // Improve cancelRecording to use stopPlayback
  const cancelRecording = () => {
    console.log('Canceling recording or playback');
    
    // Stop any recording in progress
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.warn('Error stopping media recorder tracks:', error);
      }
    }
    
    // Handle cleanup based on current state
    if (isPlaying || isPaused) {
      // If we're playing or paused, just stop the playback properly
      stopPlayback();
    } else {
      // Full cleanup only if we're not in the middle of playback
      endMediaStream().then(() => {
        cleanupAudio();
        pendingChunksRef.current = [];
        setIsRecording(false);
        setIsPlaying(false);
        setIsProcessing(false);
        setIsPaused(false);
      });
    }
  };

  const handleSend = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Updated handleCancel with better cleanup
  const handleCancel = () => {
    console.log('Canceling recording');
    
    // Stop all tracks from the media recorder
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping media recorder tracks');
      try {
        const tracks = mediaRecorderRef.current.stream.getTracks();
        tracks.forEach(track => {
          track.stop();
          console.log('Track stopped:', track.kind);
        });
      } catch (error) {
        console.warn('Error stopping media recorder tracks:', error);
      }
      mediaRecorderRef.current = null;
    }
    
    audioChunksRef.current = [];
    
    // Complete cleanup
    cleanupAudio();

    // Reset all states
    setIsRecording(false);
    setIsPlaying(false);
    setIsProcessing(false);
    setIsPaused(false);
    console.log('Recording canceled and states reset');
  };

  // Update playResponse for better error handling and mobile compatibility
  const playResponse = async () => {
    console.log('Attempting to play response');
    setMobilePlaybackError(null);
    
    // For mobile, only use the mobileBlob
    if (isMobile && !mobileBlob) {
      console.log('No audio blob available to play on mobile');
      setError('No audio ready for playback');
      return;
    }
    
    // On mobile, ensure we clean up any previous audio element first
    if (isMobile) {
      try {
        // If we had an error while stopping, do a more thorough cleanup
        if (mobilePlaybackError) {
          console.log('Doing thorough cleanup before playback due to previous error');
          cleanupAudio();
          
          // Recreate the blob URL if needed
          if (mobileBlob && !mobileAudioUrlRef.current) {
            createSafeBlobUrl(mobileBlob, true);
          }
        } else {
          // Clean up existing audio element
          if (audioElementRef.current) {
            try {
              const audio = audioElementRef.current;
              audio.pause();
              audio.onended = null;
              audio.onerror = null;
              audio.onplay = null;
              audio.onpause = null;
              audio.oncanplaythrough = null;
              audio.src = '';
              audio.load(); // Force reload to clean buffers
              audioElementRef.current = null;
            } catch (e) {
              console.warn('Error cleaning up previous audio element:', e);
            }
          }
        }
        
        // Create a fresh audio element with minimal event handlers
        const audio = new Audio();
        
        // Pre-initialize audio context to avoid autoplay restrictions
        if (!audioInitialized) {
          try {
            // Create a silent audio context interaction
            const silentContext = new (window.AudioContext || window.webkitAudioContext)();
            const silentBuffer = silentContext.createBuffer(1, 1, 22050);
            const source = silentContext.createBufferSource();
            source.buffer = silentBuffer;
            source.connect(silentContext.destination);
            source.start(0);
            
            // Mark audio as initialized
            setAudioInitialized(true);
            console.log('Audio context pre-initialized');
          } catch (err) {
            console.warn('Could not pre-initialize audio context:', err);
          }
        }
        
        // Simple event handlers to update UI state
        audio.onplay = () => {
          console.log('Mobile audio started playing');
          setIsPlaying(true);
          setIsPaused(false);
          setCanPlay(false);
        };
        
        audio.onpause = () => {
          console.log('Mobile audio paused');
          setIsPlaying(false);
          setIsPaused(true);
        };
        
        audio.onended = () => {
          console.log('Mobile audio ended');
          setIsPlaying(false);
          setIsPaused(false);
          setCanPlay(true);
        };
        
        audio.onerror = (e) => {
          const errorMessage = audio.error ? 
            `Error: ${audio.error.code} - ${audio.error.message || 'Unknown error'}` : 
            'Unknown audio error';
          console.error('Mobile audio error:', errorMessage, e);
          setMobilePlaybackError(errorMessage);
          setIsPlaying(false);
          setCanPlay(true);
        };
        
        // Use the stored mobile URL if available to prevent URL leaks
        if (mobileAudioUrlRef.current) {
          audio.src = mobileAudioUrlRef.current;
        } else {
          // Create a new URL if needed
          const url = createSafeBlobUrl(mobileBlob, true);
          if (!url) {
            throw new Error('Could not create audio URL');
          }
          audio.src = url;
        }
        
        audioElementRef.current = audio;
        
        // Play with a slight delay to ensure UI is updated
        setTimeout(async () => {
          try {
            await audio.play();
            console.log('Mobile audio playing successfully');
          } catch (error) {
            console.error('Error starting mobile audio playback:', error);
            setMobilePlaybackError(`Playback error: ${error.message || 'Unknown error'}`);
            setCanPlay(true);
          }
        }, 100);
      } catch (error) {
        console.error('Error setting up mobile audio:', error);
        setMobilePlaybackError(`Setup error: ${error.message || 'Unknown error'}`);
        setError(`Could not play audio: ${error.message || 'Unknown error'}`);
        setCanPlay(true);
      }
    } else {
      // Desktop playback remains the same
      if (!audioElementRef.current) {
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
    }
  };

  const handlePausePlayback = () => {
    if (isMobile && audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
    } else if (mediaSourceRef.current) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        setIsPaused(true);
        setIsPlaying(false);
      }
    }
  };

  const handleResumePlayback = () => {
    if (isMobile && audioElementRef.current) {
      audioElementRef.current.play();
      setIsPaused(false);
      setIsPlaying(true);
    } else if (mediaSourceRef.current) {
      if (audioElementRef.current) {
        audioElementRef.current.play();
        setIsPaused(false);
        setIsPlaying(true);
      }
    }
  };

  // Enhanced cleanup in component unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting, cleaning up resources');
      
      // Stop any ongoing recordings
      if (mediaRecorderRef.current) {
        try {
          const tracks = mediaRecorderRef.current.stream.getTracks();
          tracks.forEach(track => track.stop());
        } catch (error) {
          console.warn('Error stopping media tracks on unmount:', error);
        }
      }
      
      cleanupAudio();
      
      // Additional cleanup for any remaining audio element
      try {
        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current.src = '';
          audioElementRef.current = null;
        }
      } catch (error) {
        console.warn('Error cleaning audio element on unmount:', error);
      }
      
      if (playbackTimeoutRef.current) {
        clearInterval(playbackTimeoutRef.current);
      }
    };
  }, [isMobile]);

  // Add an additional cleanup effect specifically for mobile
  useEffect(() => {
    if (isMobile) {
      // Setup a function to fully reset audio on errors
      const resetAudioOnError = () => {
        if (mobilePlaybackError) {
          console.log('Resetting audio due to error');
          cleanupAudio();
        }
      };
      
      // Set a timeout to run cleanup a few seconds after error
      const timeoutId = setTimeout(resetAudioOnError, 5000);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [mobilePlaybackError, isMobile]);

  // Update useEffect for monitoring audio playback
  useEffect(() => {
    const audio = audioElementRef.current;
    if (audio) {
      console.log('Setting up global audio completion monitoring');
      
      const handleTimeUpdate = () => {
        const progress = audio.currentTime / audio.duration;
        console.log('Global Audio progress:', {
          currentTime: audio.currentTime,
          duration: audio.duration,
          progress: `${(progress * 100).toFixed(1)}%`,
          ended: audio.ended
        });
      };

      const handleEnded = () => {
        console.log('Global Audio playback COMPLETED via ended event');
        cleanupStates(true); // Include playback cleanup
      };

      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      
      return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
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

          {/* Display mobile-specific errors separately */}
          {mobilePlaybackError && !error && (
            <div className="error-message alert alert-warning">
              {mobilePlaybackError}
              <Button 
                variant="outline-warning" 
                size="sm"
                onClick={() => setMobilePlaybackError(null)}
              >
                <X size={16} />
              </Button>
            </div>
          )}

          {/* Only show record button when not recording, not processing, and not playing/paused */}
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

          {/* Only show processing indicator when processing and not yet playing */}
          {isProcessing && !isPlaying && !isPaused && (
            <div className="streaming-indicator">
              <Spinner animation="border" size="sm" />
              Processing...
            </div>
          )}

          {/* Show playback controls when playing or paused, regardless of processing state */}
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
                onClick={stopPlayback} // Use stopPlayback instead of cancelRecording
                className="control-button"
              >
                <Square size={20} />
              </Button>
            </div>
          )}

          {/* Add play button for mobile */}
          {isMobile && canPlay && !isRecording && !isProcessing && !isPlaying && !isPaused && (
            <Button 
              variant="primary"
              onClick={playResponse}
              className="play-button"
              disabled={!mobileBlob}
            >
              Play Response
            </Button>
          )}
          
          {/* Mobile retry button when there was an error */}
          {isMobile && mobilePlaybackError && !isPlaying && !isPaused && (
            <Button 
              variant="warning"
              onClick={playResponse}
              className="retry-button mt-2"
              disabled={!mobileBlob}
            >
              Retry Playback
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default StreamingVoiceTab;
