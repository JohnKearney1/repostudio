// ConsoleTab.tsx
import React, { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import './ConsoleTab.css';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import  { useConsoleStore, processCommand } from '../../../../scripts/ConsoleOperations';

const ConsoleTab: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messages = useConsoleStore(state => state.messages);
  const addMessage = useConsoleStore(state => state.addMessage);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = (): void => {
    if (inputValue.trim() === "") return;
    setCommandHistory((prev) => [...prev, inputValue]);
    setHistoryIndex(null);
    const response = processCommand(inputValue);
    if (response !== null) {
      addMessage(response);
    }
    setInputValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex =
          historyIndex === null ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      // Only process if we’re navigating history.
      if (commandHistory.length > 0 && historyIndex !== null) {
        const newIndex = historyIndex + 1;
        // If newIndex exceeds the command history, reset the history and clear the input
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(null);
          setInputValue("");
        } else {
          setHistoryIndex(newIndex);
          setInputValue(commandHistory[newIndex]);
        }
      }
    }
  }    

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value);
  };

  return (
    <div className="ConsoleTab">
      <div className="console-output">
        {messages.map((msg) => (
          <div key={msg.id} className="console-message">
            <code className="message-timestamp">[{msg.timestamp}]</code>{" "}
            <code className="message-text">{msg.text}</code>
          </div>
        ))}
      </div>
      <div className="console-input">
        <input
          className="console-input-field"
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
        />
        <button onClick={handleSend} className="console-send-button">
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
};

export default ConsoleTab;
