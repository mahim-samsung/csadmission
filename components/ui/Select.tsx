"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({ value, onChange, options, placeholder, className = "" }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === "ArrowDown" && isOpen) {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < options.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp" && isOpen) {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Handle option selection
  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setHighlightedIndex(-1);
    triggerRef.current?.focus();
  };

  // Handle enter key on highlighted option
  useEffect(() => {
    const handleKeyDownOnDocument = (e: KeyboardEvent) => {
      if (isOpen && (e.key === "Enter" || e.key === " ") && highlightedIndex >= 0) {
        e.preventDefault();
        handleOptionClick(options[highlightedIndex].value);
      }
    };

    document.addEventListener("keydown", handleKeyDownOnDocument as any);
    return () => document.removeEventListener("keydown", handleKeyDownOnDocument as any);
  }, [isOpen, highlightedIndex, options]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800
          placeholder:text-slate-400 transition-all duration-150
          focus:outline-none focus:border-[#1378DE]
          focus:ring-4 focus:ring-[#4697EA]/20
          disabled:cursor-not-allowed disabled:opacity-50
          flex items-center justify-between
          ${isOpen ? "ring-4 ring-[#4697EA]/20 border-[#1378DE]" : ""}
        `}
      >
        <span className={selectedOption ? "" : "text-slate-400"}>
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
          />
        </svg>
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/50"
          role="listbox"
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              onClick={() => handleOptionClick(option.value)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`
                relative cursor-pointer select-none px-3 py-2 text-sm transition-colors
                ${value === option.value
                  ? "bg-[#EAF3FD] text-[#0A66C2] font-medium"
                  : "text-slate-700 hover:bg-[#EAF3FD] hover:text-[#0A66C2]"
                }
                ${highlightedIndex === index && value !== option.value ? "bg-[#CCDFF8]" : ""}
              `}
            >
              <div className="flex items-center justify-between">
                <span>{option.label}</span>
                {value === option.value && (
                  <svg
                    className="h-4 w-4 text-[#0A66C2]"
                    viewBox="0 0 20 20" fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    />
                  </svg>
                )}
              </div>
            </div>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-400">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}