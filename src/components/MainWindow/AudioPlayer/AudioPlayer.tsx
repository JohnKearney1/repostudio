import React, { useRef, useState, useEffect } from 'react';
import { PlayIcon, PauseIcon } from '@radix-ui/react-icons';
import { useFileStore } from '../../../scripts/store/store';
import { readFile } from '@tauri-apps/plugin-fs';
import './AudioPlayer.css';

const LOCAL_PLAYING_KEY = 'audioPlayerIsPlaying';

const AudioPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { selectedFiles } = useFileStore();
  const singleSelected = selectedFiles[0] || null;
  const [audioUrl, setAudioUrl] = useState('');

  useEffect(() => {
    if (!singleSelected) return setAudioUrl('');
    readFile(singleSelected.path)
      .then(file => {
        const url = URL.createObjectURL(new Blob([file]));
        setAudioUrl(url);
      })
      .catch(console.error);
  }, [singleSelected?.id]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      const storedState = localStorage.getItem(LOCAL_PLAYING_KEY);
      if (storedState && JSON.parse(storedState)) {
        audio.play();
        setIsPlaying(true);
      }
    };

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);

    const handleEnded = () => {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      localStorage.setItem(LOCAL_PLAYING_KEY, JSON.stringify(false));
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    isPlaying ? audio.pause() : audio.play();
    const newState = !isPlaying;
    setIsPlaying(newState);
    localStorage.setItem(LOCAL_PLAYING_KEY, JSON.stringify(newState));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) =>
    `${Math.floor(time / 60)}:${Math.floor(time % 60) < 10 ? '0' : ''}${Math.floor(time % 60)}`;

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="audio-player">
      <div className="audio-controls">
        {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}
        <button onClick={togglePlayPause} className="play-pause-button">
          {isPlaying ? <PauseIcon height="20px" width="20px" /> : <PlayIcon height="20px" width="20px"/>}
        </button>
        <input
          type="range"
          min="0"
          max={duration}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          style={{
            background: `linear-gradient(to right,rgb(144, 214, 255) 0%, #00a2ff ${progress}%, #444 ${progress}%, #444 100%)`
          }}
        />

        <div className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
      <div className="audio-info">
        {singleSelected ? (
          <h5 className="audio-title">{singleSelected.name.split('.').slice(0, -1).join('.')} - {singleSelected.encoding}</h5>
        ) : (
          <h5 className="no-audio-selected">No audio file selected</h5>
        )}
      </div>
    </div>
  );
};

export default AudioPlayer;
