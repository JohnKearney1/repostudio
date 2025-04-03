// ConsoleTab.tsx
import React, { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import './ConsoleTab.css';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import  { useConsoleStore, ConsoleMessage, processCommand } from '../../../../scripts/ConsoleOperations';

const ConsoleTab: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get persistent messages from the store
  const messages = useConsoleStore(state => state.messages);
  const addMessage = useConsoleStore(state => state.addMessage);

  // Focus on the input when the component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = (): void => {
    if (inputValue.trim() === "") return;

    // Store the command in history (without logging it as output)
    setCommandHistory((prev) => [...prev, inputValue]);
    setHistoryIndex(null);

    // Process the command and add the response to the persistent store
    const response: ConsoleMessage = processCommand(inputValue);
    addMessage(response);

    // Clear the input field
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
      if (commandHistory.length > 0 && historyIndex !== null) {
        const newIndex = Math.min(commandHistory.length - 1, historyIndex + 1);
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex] || "");
      }
    }
  };

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
