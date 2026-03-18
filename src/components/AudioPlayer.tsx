import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X, Headphones } from 'lucide-react';
import { Book } from '../types';

interface AudioPlayerProps {
  book: Book;
  onClose: () => void;
}

export default function AudioPlayer({ book, onClose }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Mock audio source for demo
  const audioSrc = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.error("Playback failed:", err));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-midnight/95 backdrop-blur-2xl"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="relative w-full max-w-lg bg-slate border border-gold/20 rounded-[40px] overflow-hidden shadow-2xl p-8 sm:p-12"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/60 hover:bg-accent hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-8">
          <div className="relative group">
            <div className="w-48 h-48 sm:w-64 sm:h-64 bg-navy rounded-[40px] flex items-center justify-center text-8xl sm:text-9xl shadow-2xl border border-gold/10 group-hover:border-gold transition-all duration-500 overflow-hidden">
              {book.cover_icon.startsWith('http') ? (
                <img src={book.cover_icon} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                book.cover_icon
              )}
            </div>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-gold rounded-2xl flex items-center justify-center shadow-xl shadow-gold/20 animate-pulse">
              <Headphones className="w-8 h-8 text-midnight" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-gold text-[10px] sm:text-xs font-bold uppercase tracking-[4px]">Now Playing</span>
            <h3 className="font-serif text-3xl sm:text-4xl text-white line-clamp-1">{book.title}</h3>
            <p className="text-gold/60 font-medium">Narrated by Professional Voice Artist</p>
          </div>

          <audio 
            ref={audioRef}
            src={audioSrc}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />

          {/* Progress Bar */}
          <div className="w-full space-y-3">
            <input 
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-gold hover:accent-gold-bright transition-all"
            />
            <div className="flex justify-between text-[10px] sm:text-xs font-bold text-gold/40 uppercase tracking-widest">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-8 sm:gap-12">
            <button className="text-white/40 hover:text-gold transition-colors">
              <SkipBack className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
            </button>
            <button 
              onClick={togglePlay}
              className="w-20 h-20 sm:w-24 sm:h-24 bg-gold text-midnight rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-gold/20"
            >
              {isPlaying ? <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-current" /> : <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />}
            </button>
            <button className="text-white/40 hover:text-gold transition-colors">
              <SkipForward className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
            </button>
          </div>

          {/* Volume */}
          <div className="w-full flex items-center gap-4 px-4 sm:px-8">
            <button onClick={() => setIsMuted(!isMuted)} className="text-gold/60 hover:text-gold transition-colors">
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input 
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-gold/60 hover:accent-gold transition-all"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
