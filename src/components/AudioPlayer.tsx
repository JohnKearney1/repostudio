import React, { useRef, useState, useEffect } from 'react';
import { PlayIcon, PauseIcon } from '@radix-ui/react-icons';
import { useFileStore } from './store';
import { readFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import './AudioPlayer.css';

interface StoredAudio {
  fileId: string;
  url: string;
}

const LOCAL_AUDIO_KEY = 'audioPlayerUrl';

const AudioPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // If multiple files are selected, use the first one.
  const { selectedFiles } = useFileStore();
  const singleSelected = selectedFiles[0] || null;

  // State to hold the generated audio URL.
  const [audioUrl, setAudioUrl] = useState<string>('');

  // Helper: save audio URL info to localStorage.
  const saveAudioInfo = (fileId: string, url: string) => {
    const data: StoredAudio = { fileId, url };
    localStorage.setItem(LOCAL_AUDIO_KEY, JSON.stringify(data));
  };

  // Helper: retrieve stored audio info.
  const getStoredAudioInfo = (): StoredAudio | null => {
    const stored = localStorage.getItem(LOCAL_AUDIO_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as StoredAudio;
      } catch {
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    setAudioUrl('');
    if (singleSelected) {
      const storedInfo = getStoredAudioInfo();
      if (storedInfo && storedInfo.fileId === singleSelected.id) {
        setAudioUrl(storedInfo.url);
      } else {
        readFile(singleSelected.path, { baseDir: BaseDirectory.Audio })
          .then((file) => {
            const url = URL.createObjectURL(new Blob([file]));
            setAudioUrl(url);
            console.log('Generated new audio url:', url);
            saveAudioInfo(singleSelected.id, url);
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
  }, [singleSelected?.id]);
  

  // Reset playback state when audioUrl changes.
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  };

  return (
    <div className="audio-player">
      <div className="audio-controls">
        {audioUrl && (
          <audio ref={audioRef} src={audioUrl} preload="metadata" />
        )}
        <button onClick={togglePlayPause} className="play-pause-button">
          {isPlaying ? (
            <PauseIcon height="20px" width="20px" />
          ) : (
            <PlayIcon height="20px" width="20px" />
          )}
        </button>
        <input
          type="range"
          min="0"
          max={duration}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
        />
        <div className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
      <div className="audio-info">
        {singleSelected ? (
          <>
            <h4 className="audio-title">{singleSelected.name}</h4>
            <h5 className="audio-path">{singleSelected.encoding}</h5>
          </>
        ) : (
          <div className="no-audio-selected">No audio file selected</div>
        )}
      </div>
    </div>
  );
};

export default AudioPlayer;
