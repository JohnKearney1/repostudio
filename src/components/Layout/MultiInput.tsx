import React, { useState, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import './MultiInput.css';
import { Cross2Icon } from '@radix-ui/react-icons';

interface MultiInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onEnterPress?: () => void;
}

const MultiInput: React.FC<MultiInputProps> = ({ value, onChange, onEnterPress }) => {
  // Initialize the items from the provided value prop, if any.
  const [items, setItems] = useState<string[]>(() => {
    return value
      ? value.split(',').map(item => item.trim()).filter(item => item.length > 0)
      : [];
  });
  const [inputValue, setInputValue] = useState('');

  // Update internal items when the value prop changes.
  useEffect(() => {
    const newItems = value
      ? value.split(',').map(item => item.trim()).filter(item => item.length > 0)
      : [];
    setItems(newItems);
  }, [value]);

  // Whenever items change, propagate the updated value to the parent.
  useEffect(() => {
    if (onChange) {
      onChange(items.join(', '));
    }
  }, [items, onChange]);

  const addItemsFromInput = (value: string) => {
    // Split the input on comma
    const parts = value.split(',');
    // All parts except the last are considered complete items
    const newItems = parts.slice(0, -1)
      .map(item => item.trim())
      .filter(item => item.length > 0);

    if (newItems.length > 0) {
      setItems(prevItems => [...prevItems, ...newItems]);
    }
    // The last part (which might be an incomplete item) remains in the input field
    setInputValue(parts[parts.length - 1]);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    // If a comma is present, process the input to add completed items.
    if (value.includes(',')) {
      addItemsFromInput(value);
    } else {
      setInputValue(value);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // When user hits "Enter", treat the current input as complete
    if (e.key === 'Enter' && inputValue.trim()) {
      setItems(prevItems => [...prevItems, inputValue.trim()]);
      setInputValue('');

      if (onEnterPress) {
        onEnterPress();
      }

      e.preventDefault();
      e.stopPropagation();

    }
    // If the input is empty and user hits backspace, remove the last item
    else if (e.key === 'Backspace' && !inputValue) {
      setItems(prevItems => prevItems.slice(0, -1));
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(prevItems => prevItems.filter((_, i) => i !== index));
  };

  return (
    <div className="multi-input-container">
      {items.map((item, index) => (
        <div
          key={index}
          className="multi-input-item"
          onClick={() => handleRemoveItem(index)}
        >
          <h5>{item}</h5>
          <Cross2Icon height="12px" width="12px" color="white" />
        </div>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="multi-input-input"
        placeholder="Add an item..."
      />
    </div>
  );
};

export default MultiInput;
