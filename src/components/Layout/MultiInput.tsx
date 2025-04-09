import React, { useState, KeyboardEvent, ChangeEvent } from 'react';
import './MultiInput.css';
import { Cross2Icon } from '@radix-ui/react-icons';

interface MultiInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onEnterPress?: () => void;
}

const MultiInput: React.FC<MultiInputProps> = ({ value = '', onChange, onEnterPress }) => {
  const items = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  const [inputValue, setInputValue] = useState('');

  const updateItems = (newItems: string[]) => {
    if (onChange) {
      onChange(newItems.join(', '));
    }
  };

  const addItemsFromInput = (input: string) => {
    const parts = input.split(',');
    const newItems = parts.slice(0, -1)
      .map(item => item.trim())
      .filter(item => item.length > 0);
    if (newItems.length > 0) {
      updateItems([...items, ...newItems]);
    }
    setInputValue(parts[parts.length - 1]);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    if (newVal.includes(',')) {
      addItemsFromInput(newVal);
    } else {
      setInputValue(newVal);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      updateItems([...items, inputValue.trim()]);
      setInputValue('');
      if (onEnterPress) {
        onEnterPress();
      }
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === 'Backspace' && !inputValue) {
      updateItems(items.slice(0, -1));
    }
  };

  const handleRemoveItem = (index: number) => {
    updateItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="multi-input-container">
      {items.map((item, index) => (
        <div 
        key={index}
          className="multi-input-item"
          onClick={() => handleRemoveItem(index)}>
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
