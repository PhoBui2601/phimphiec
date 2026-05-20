import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  PictureInPicture, RotateCcw, RotateCw, Settings, Check,
  ChevronUp, ChevronDown, SkipBack, SkipForward, MonitorPlay, Loader2,
  Gauge, FastForward
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Episode {
  name: string;
  slug: string;
  filename: string;
  link_embed: string;
  link_m3u8: string;
}

interface Server {
  server_name: string;
  server_data: Episode[];
}

interface QualityLevel {
  height: number;
  bitrate: number;
  index: number;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  servers?: Server[];
  currentServerName?: string;
  currentEpisodeName?: string;
  onServerChange?: (serverName: string) => void;
  startTime?: number;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, 
  poster, 
  servers = [], 
  currentServerName, 
  currentEpisodeName,
  onServerChange,
  startTime = 0,
  onTimeUpdate,
  onDurationChange,
  onNextEpisode,
  onPrevEpisode,
  hasNext = false,
  hasPrev = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (onDurationChange) {
      onDurationChange(duration);
    }
  }, [duration, onDurationChange]);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Adaptive device type tracking (touch vs mouse)
  const [deviceType, setDeviceType] = useState<'mouse' | 'touch'>(('ontouchstart' in window) && navigator.maxTouchPoints > 0 ? 'touch' : 'mouse');
  
  const hlsRef = useRef<Hls | null>(null);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [showQualitySettings, setShowQualitySettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leftIndicatorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rightIndicatorTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [interactionKey, setInteractionKey] = useState(0);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    setInteractionKey(prev => prev + 1);
  }, []);

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!src) return;

    let hls: Hls | null = null;
    let hasSeeked = false;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (!hasSeeked && startTime > 0) {
        video.currentTime = startTime;
        hasSeeked = true;
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (onTimeUpdate) onTimeUpdate(video.currentTime);
    };

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleCanPlay = () => setIsBuffering(false);

    if (Hls.isSupported()) {
      hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const levels = data.levels.map((level, index) => ({
          height: level.height,
          bitrate: level.bitrate,
          index: index
        })).sort((a, b) => b.height - a.height);
        
        const uniqueLevels = levels.filter((level, index, self) =>
          index === self.findIndex((t) => t.height === level.height)
        );

        setQualityLevels(uniqueLevels);
        setCurrentQuality(-1);

        if (startTime > 0) {
           video.currentTime = startTime;
           hasSeeked = true;
        }
        video.play().catch(() => {});
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      if (startTime > 0) {
        // Need to wait for metadata to seek properly on some browsers
      }
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      if (hls) hls.destroy();
      if (leftIndicatorTimerRef.current) clearTimeout(leftIndicatorTimerRef.current);
      if (rightIndicatorTimerRef.current) clearTimeout(rightIndicatorTimerRef.current);
      if (video) {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [src]);

  // Handle Controls Visibility Timeout
  useEffect(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    if (showControls) {
      const timeoutDuration = deviceType === 'touch' ? 5000 : 3000;
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying && !showSettings && !showQualitySettings && !showSpeedMenu) {
          setShowControls(false);
        }
      }, timeoutDuration);
    }

    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [showControls, isPlaying, showSettings, showQualitySettings, showSpeedMenu, deviceType, interactionKey]);

  const handleMouseMove = useCallback(() => {
    // Only respond to real mouse movements, not synthetic events from touch
    if (deviceType === 'mouse') {
      resetControlsTimeout();
    }
  }, [deviceType, resetControlsTimeout]);

  const handleQualityChange = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentQuality(levelIndex);
      setShowQualitySettings(false);
    }
  };

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      setShowSpeedMenu(false);
    }
  };



  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(e => console.log("Play error:", e));
      } else {
        videoRef.current.pause();
      }
    }
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipTime = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMutedState = !videoRef.current.muted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      
      if (newMutedState) {
        videoRef.current.volume = 0;
      } else {
        videoRef.current.volume = volume || 1;
      }
    }
  }, [volume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
        if (window.screen && window.screen.orientation && (window.screen.orientation as any).lock) {
          try {
            await (window.screen.orientation as any).lock('landscape');
          } catch(e) {}
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          try {
            window.screen.orientation.unlock();
          } catch(e) {}
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs && window.screen && window.screen.orientation && window.screen.orientation.unlock) {
        try { window.screen.orientation.unlock(); } catch(e) {}
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePIP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      switch(e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          skipTime(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          skipTime(10);
          break;
        case 'arrowup':
          e.preventDefault();
          const newVolUp = Math.min(1, volume + 0.1);
          setVolume(newVolUp);
          if (videoRef.current) {
            videoRef.current.volume = newVolUp;
            setIsMuted(newVolUp === 0);
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          const newVolDown = Math.max(0, volume - 0.1);
          setVolume(newVolDown);
          if (videoRef.current) {
            videoRef.current.volume = newVolDown;
            setIsMuted(newVolDown === 0);
          }
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'n':
          if (hasNext && onNextEpisode) {
             e.preventDefault();
             onNextEpisode();
          }
          break;
        case 'p':
          if (hasPrev && onPrevEpisode) {
             e.preventDefault();
             onPrevEpisode();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipTime, toggleFullscreen, toggleMute, volume, hasNext, hasPrev, onNextEpisode, onPrevEpisode]);

  const lastTapRef = useRef(0);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const isTouchInteraction = e.pointerType === 'touch' || e.pointerType === 'pen';
    if (isTouchInteraction) setDeviceType('touch');
    else setDeviceType('mouse');

    // Close settings if open on tap/click outside settings panel
    if (showSettings || showQualitySettings || showSpeedMenu) {
      setShowSettings(false);
      setShowQualitySettings(false);
      setShowSpeedMenu(false);
      resetControlsTimeout();
      lastTapRef.current = 0; // prevent double tap trigger
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    // Cancel any pending single-tap action
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }

    // Double tap/click logic (works for both touch and mouse)
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        if (clickX < rect.width / 2) {
          skipTime(-10);
          setShowLeftIndicator(true);
          if (leftIndicatorTimerRef.current) clearTimeout(leftIndicatorTimerRef.current);
          leftIndicatorTimerRef.current = setTimeout(() => setShowLeftIndicator(false), 800);
        } else {
          skipTime(10);
          setShowRightIndicator(true);
          if (rightIndicatorTimerRef.current) clearTimeout(rightIndicatorTimerRef.current);
          rightIndicatorTimerRef.current = setTimeout(() => setShowRightIndicator(false), 800);
        }
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Single action logic - delay for touch to allow double-tap detection
      if (isTouchInteraction) {
        singleTapTimerRef.current = setTimeout(() => {
          setShowControls(prev => !prev);
          singleTapTimerRef.current = null;
        }, DOUBLE_TAP_DELAY);
      } else {
        togglePlay();
      }
    }
  }, [skipTime, togglePlay, showSettings, showQualitySettings, showSpeedMenu, resetControlsTimeout]);

  // Cleanup single tap timer on unmount
  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (leftIndicatorTimerRef.current) clearTimeout(leftIndicatorTimerRef.current);
      if (rightIndicatorTimerRef.current) clearTimeout(rightIndicatorTimerRef.current);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden group shadow-2xl border border-white/10 flex items-center justify-center select-none ${!showControls && isPlaying ? 'cursor-none' : ''}`}
      style={{ touchAction: 'manipulation' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        // Only hide on actual mouse leave, not synthetic events from touch
        if (deviceType === 'mouse' && isPlaying) setShowControls(false);
      }}
      onPointerUp={handlePointerUp}
      onPointerDown={(e) => {
        if (e.pointerType === 'touch' || e.pointerType === 'pen') setDeviceType('touch');
        else setDeviceType('mouse');
        if (e.pointerType !== 'touch' || showControls) {
          resetControlsTimeout();
        }
      }}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
      />

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10 pointer-events-none transition-all">
          <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4 drop-shadow-[0_0_15px_rgba(14,165,233,0.5)]" />
          <p className="text-white/90 font-medium text-sm drop-shadow-md animate-pulse">Đang tải dữ liệu mạng...</p>
        </div>
      )}

      {/* Center Mobile Play/Pause Button — z-30 to sit ABOVE the controls overlay (z-20) */}
      <AnimatePresence>
        {showControls && deviceType === 'touch' && !isBuffering && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
          >
            <button 
              onPointerDown={(e) => {
                e.stopPropagation();
                resetControlsTimeout();
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                // Cancel any pending single-tap toggle from the container
                if (singleTapTimerRef.current) {
                  clearTimeout(singleTapTimerRef.current);
                  singleTapTimerRef.current = null;
                }
                togglePlay();
              }}
              onTouchEnd={(e) => { e.stopPropagation(); }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="p-6 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 pointer-events-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)] active:scale-95 transition-transform"
              style={{ touchAction: 'manipulation' }}
            >
              {isPlaying ? <Pause className="w-10 h-10 fill-white" /> : <Play className="w-10 h-10 fill-white ml-2" />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seek Indicators */}
      <AnimatePresence>
        {showLeftIndicator && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="absolute left-1/4 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center gap-3 bg-black/40 backdrop-blur-xl border border-white/15 px-6 py-4 rounded-3xl text-white shadow-2xl"
          >
            <RotateCcw className="w-10 h-10 text-yellow-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
            <span className="text-lg font-black tracking-widest font-mono">&lt;-10s</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showRightIndicator && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="absolute right-1/4 translate-x-1/2 top-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center gap-3 bg-black/40 backdrop-blur-xl border border-white/15 px-6 py-4 rounded-3xl text-white shadow-2xl"
          >
            <RotateCw className="w-10 h-10 text-yellow-500 animate-spin" style={{ animationDuration: '0.8s' }} />
            <span className="text-lg font-black tracking-widest font-mono">+10s&gt;</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end px-4 pb-4 md:px-6 md:pb-6 z-20 pointer-events-none"
          >
            <div 
              onClick={(e) => e.stopPropagation()} 
              onPointerUp={(e) => e.stopPropagation()}
              onPointerDown={(e) => {
                e.stopPropagation();
                resetControlsTimeout();
              }}
              onPointerMove={(e) => {
                resetControlsTimeout();
              }}
              className="w-full pointer-events-auto"
            >
              {/* Progress Bar & Time */}
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                <span className="text-[10px] sm:text-xs font-medium text-white/90 font-mono w-8 sm:w-10 text-center">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1 group/progress relative flex items-center">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500 hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                    style={{
                      background: `linear-gradient(to right, #eab308 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / duration) * 100}%)`
                    }}
                  />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-white/90 font-mono w-8 sm:w-10 text-center">
                  {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                {/* Left Controls */}
                <div className="flex items-center gap-1 sm:gap-4">
                  
                  {/* Play/Pause & Skip Buttons */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    {hasPrev && (
                      <button 
                        onClick={onPrevEpisode}
                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/20 text-white transition-all active:scale-95"
                        title="Tập trước"
                      >
                        <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                      </button>
                    )}

                    <button 
                      onClick={togglePlay}
                      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/20 text-white transition-all active:scale-95"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-white" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />}
                    </button>

                    {hasNext && (
                      <button 
                        onClick={onNextEpisode}
                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/20 text-white transition-all active:scale-95"
                        title="Tập tiếp theo"
                      >
                        <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2">
                    <button 
                      onClick={() => skipTime(-10)} 
                      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/20 text-white transition-all active:scale-95 group/skip"
                    >
                      <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 group-hover/skip:-rotate-45 transition-transform" />
                    </button>
                    <button 
                      onClick={() => skipTime(10)} 
                      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/20 text-white transition-all active:scale-95 group/skip"
                    >
                      <RotateCw className="w-4 h-4 sm:w-5 sm:h-5 group-hover/skip:rotate-45 transition-transform" />
                    </button>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 group/volume">
                    <button 
                      onClick={toggleMute} 
                      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/20 text-white transition-all active:scale-95"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
                    </button>
                    <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-1 sm:gap-3">
                  {/* Quality Selector */}
                  {qualityLevels.length > 1 && (
                    <div className="relative">
                      <button 
                        onClick={() => {
                          setShowQualitySettings(!showQualitySettings);
                          setShowSettings(false);
                          setShowSpeedMenu(false);
                        }}
                        className="h-10 px-2.5 sm:px-3 flex items-center justify-center gap-1 sm:gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium transition-all backdrop-blur-sm border border-white/10 active:scale-95"
                      >
                        <MonitorPlay className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">
                          {currentQuality === -1 
                            ? 'Auto' 
                            : `${qualityLevels.find(q => q.index === currentQuality)?.height}p`}
                        </span>
                        <span className="sm:hidden">
                          {currentQuality === -1 
                            ? 'Auto' 
                            : `${qualityLevels.find(q => q.index === currentQuality)?.height}p`}
                        </span>
                      </button>

                      <AnimatePresence>
                        {showQualitySettings && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full right-0 mb-2 sm:mb-3 w-24 sm:w-32 bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden z-30"
                          >
                            <div className="p-1.5 sm:p-2 space-y-1">
                              <button
                                onClick={() => handleQualityChange(-1)}
                                className={`w-full flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-all ${
                                  currentQuality === -1 
                                    ? 'bg-white/20 text-white font-bold' 
                                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <span>Auto</span>
                                {currentQuality === -1 && <Check className="w-3 h-3" />}
                              </button>
                              {qualityLevels.map((level) => (
                                <button
                                  key={level.index}
                                  onClick={() => handleQualityChange(level.index)}
                                  className={`w-full flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-all ${
                                    currentQuality === level.index 
                                      ? 'bg-white/20 text-white font-bold' 
                                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  <span>{level.height}p</span>
                                  {currentQuality === level.index && <Check className="w-3 h-3" />}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Server/Type Selector */}
                  {servers.length > 0 && (
                    <div className="relative">
                      <button 
                        onClick={() => {
                          setShowSettings(!showSettings);
                          setShowQualitySettings(false);
                          setShowSpeedMenu(false);
                        }}
                        className="h-10 px-2.5 sm:px-3 flex items-center justify-center gap-1 sm:gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium transition-all backdrop-blur-sm border border-white/10 active:scale-95"
                      >
                        <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">{currentServerName || 'Server'}</span>
                        <span className="sm:hidden">{currentServerName ? `#${currentServerName.substring(0, 3)}` : 'Srv'}</span>
                      </button>

                      <AnimatePresence>
                        {showSettings && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full right-0 mb-2 sm:mb-3 w-36 sm:w-48 bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden z-30"
                          >
                            <div className="p-1.5 sm:p-2 space-y-1">
                              {servers.map((server) => (
                                <button
                                  key={server.server_name}
                                  onClick={() => {
                                    if (onServerChange) onServerChange(server.server_name);
                                    setShowSettings(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-all ${
                                    currentServerName === server.server_name 
                                      ? 'bg-white/20 text-white font-bold' 
                                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  <span className="truncate">#{server.server_name}</span>
                                  {currentServerName === server.server_name && <Check className="w-3 h-3" />}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Playback Speed Selector */}
                  <div className="relative">
                    <button 
                      onClick={() => {
                        setShowSpeedMenu(!showSpeedMenu);
                        setShowSettings(false);
                        setShowQualitySettings(false);
                      }}
                      className="h-10 px-2.5 sm:px-3 flex items-center justify-center gap-1 sm:gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium transition-all backdrop-blur-sm border border-white/10 active:scale-95"
                    >
                      <Gauge className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{playbackSpeed}x</span>
                    </button>

                    <AnimatePresence>
                      {showSpeedMenu && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full right-0 mb-2 sm:mb-3 w-24 sm:w-28 bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden z-30"
                        >
                          <div className="p-1.5 sm:p-2 space-y-0.5">
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                              <button
                                key={speed}
                                onClick={() => handleSpeedChange(speed)}
                                className={`w-full flex items-center justify-between px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all ${
                                  playbackSpeed === speed 
                                    ? 'bg-white/20 text-white font-bold' 
                                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <span>{speed}x</span>
                                {playbackSpeed === speed && <Check className="w-3 h-3" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button 
                    onClick={togglePIP}
                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/20 text-white transition-all active:scale-95 hidden sm:flex"
                    title="Picture in Picture"
                  >
                    <PictureInPicture className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <button 
                    onClick={toggleFullscreen}
                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/20 text-white transition-all active:scale-95"
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5 sm:w-6 sm:h-6" /> : <Maximize className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoPlayer;
