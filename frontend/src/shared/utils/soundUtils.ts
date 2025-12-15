/**
 * Utility functions for playing sounds in the POS system
 */

let beepAudio: HTMLAudioElement | null = null;

/**
 * Initialize the beep audio element
 * This is called once to preload the audio file
 */
function initBeepAudio(): HTMLAudioElement {
  if (beepAudio) {
    return beepAudio;
  }

  // Try to load the beep sound file
  beepAudio = new Audio('/sounds/beep.mp3');
  beepAudio.volume = 0.5; // Set volume to 50%
  beepAudio.preload = 'auto';
  
  // Handle errors gracefully (file might not exist yet)
  beepAudio.addEventListener('error', () => {
    console.warn('[SoundUtils] Could not load beep.mp3, using fallback beep');
  });

  return beepAudio;
}

/**
 * Play a beep sound when a barcode is scanned
 * Falls back to a programmatically generated beep if the audio file is not available
 */
export function playBeepSound(): void {
  try {
    const audio = initBeepAudio();
    
    // Reset audio to start if it's already playing
    if (audio.currentTime > 0) {
      audio.currentTime = 0;
    }
    
    // Play the sound
    audio.play().catch((error) => {
      // If file doesn't exist or autoplay is blocked, use fallback
      console.debug('[SoundUtils] Could not play beep.mp3, using fallback:', error);
      playFallbackBeep();
    });
  } catch (error) {
    // If audio initialization fails, use fallback
    console.debug('[SoundUtils] Audio initialization failed, using fallback:', error);
    playFallbackBeep();
  }
}

/**
 * Fallback beep using Web Audio API
 * Generates a short beep sound programmatically
 */
function playFallbackBeep(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure beep sound (800Hz, 100ms duration)
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    // Silently fail if Web Audio API is not supported
    console.debug('[SoundUtils] Fallback beep not supported:', error);
  }
}

/**
 * Preload the beep sound when the app initializes
 * This ensures the sound is ready to play immediately
 */
export function preloadBeepSound(): void {
  try {
    initBeepAudio();
  } catch (error) {
    console.debug('[SoundUtils] Could not preload beep sound:', error);
  }
}

