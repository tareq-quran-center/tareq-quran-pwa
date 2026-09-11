"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { lightHaptic, warningHaptic } from "@/lib/haptics";

const AUDIO_PLAY_EVENT = "tareq-quran-audio-play";

export interface CompactAudioPlayerProps {
  src: string | null | undefined;
  title?: string;
  className?: string;
  compact?: boolean;
}

export function CompactAudioPlayer({
  src,
  title = "تلاوة مسجلة",
  className = "",
  compact = false,
}: CompactAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerId = useRef(`audio_${Math.random().toString(36).substring(2, 9)}`);

  // 1. Single Audio Playback Manager: Pause any other playing audio when a new one starts
  useEffect(() => {
    const handleOtherPlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail?.id !== playerId.current) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(AUDIO_PLAY_EVENT, handleOtherPlay);
      return () => {
        window.removeEventListener(AUDIO_PLAY_EVENT, handleOtherPlay);
      };
    }
  }, []);

  // Reset state if src changes
  useEffect(() => {
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
  }, [src]);

  if (!src) return null;

  const togglePlay = async () => {
    lightHaptic();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        setHasError(false);
        setIsLoading(true);

        // Notify other players to stop immediately
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(AUDIO_PLAY_EVENT, { detail: { id: playerId.current } })
          );
        }

        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn("Audio playback error:", err);
        warningHaptic();
        setIsPlaying(false);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      if (!isNaN(d) && isFinite(d)) {
        setDuration(d);
      }
    }
    setIsLoading(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.load();
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      dir="rtl"
      className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-burgundy-50/90 dark:bg-burgundy-950/60 border border-burgundy-200/80 dark:border-burgundy-800/80 shadow-xs max-w-full text-right transition-all select-none ${className}`}
    >
      {/* Strict zero-load preload="none" - Does not fetch any byte until played */}
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => {
          setIsLoading(false);
          setIsPlaying(false);
          setHasError(true);
        }}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
      />

      {hasError ? (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 py-0.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] font-bold">تعذر تحميل التسجيل</span>
          <button
            type="button"
            onClick={handleRetry}
            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg text-rose-700 dark:text-rose-300"
            title="إعادة المحاولة"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          {/* Play/Pause/Loading Button */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={isLoading}
            className="w-8 h-8 rounded-xl bg-burgundy-800 hover:bg-burgundy-900 text-white flex items-center justify-center shadow-xs shrink-0 transition-all active:scale-95 cursor-pointer disabled:opacity-80"
            title={isPlaying ? "إيقاف مؤقت" : "استماع للتلاوة"}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          {/* Title & Scrub Timeline Bar */}
          <div className="flex flex-col min-w-[130px] sm:min-w-[170px] max-w-[220px] gap-1 flex-1">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-burgundy-900 dark:text-burgundy-200">
              <span className="flex items-center gap-1 truncate">
                <Volume2 className="w-3 h-3 text-burgundy-700 dark:text-burgundy-400 shrink-0" />
                <span className="truncate">{title}</span>
              </span>
              <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                {formatTime(currentTime)}{duration > 0 ? ` / ${formatTime(duration)}` : ""}
              </span>
            </div>

            {/* Micro Range Bar */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              disabled={duration === 0}
              className="w-full h-1 bg-burgundy-200 dark:bg-burgundy-800 rounded-lg appearance-none cursor-pointer accent-burgundy-800 dark:accent-burgundy-400 disabled:opacity-50"
            />
          </div>
        </>
      )}
    </div>
  );
}
