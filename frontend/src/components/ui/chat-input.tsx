import React, { useEffect, useState, useRef, useCallback, memo } from "react";
import { Plus, Mic } from "lucide-react";

// ===== TYPES =====

export interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  disabled?: boolean;
  isListening?: boolean;
  onToggleListen?: (e: React.MouseEvent) => void;
  glowIntensity?: number;
  expandOnFocus?: boolean;
  animationDuration?: number;
  textColor?: string;
  backgroundOpacity?: number;
  showEffects?: boolean;
  menuOptions?: { id: string; label: string; icon: React.ReactNode }[];
  selectedOptionId?: string;
  onSelectOption?: (id: string) => void;
}

// ... internal props ...
interface InputAreaProps {
  value: string;
  setValue: (val: string) => void;
  placeholder: string;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  disabled: boolean;
  isSubmitDisabled: boolean;
  textColor: string;
  isListening?: boolean;
  onToggleListen?: (e: React.MouseEvent) => void;
}

// ===== COMPONENTS =====

const SendButton = memo(({ 
  isDisabled,
}: { isDisabled: boolean; }) => {
  return (
    <button
      type="submit"
      aria-label="Send message"
      disabled={isDisabled}
      className={`ml-1 self-center h-8 w-8 flex shrink-0 items-center justify-center rounded-full border-0 p-0 transition-all z-20 ${
        isDisabled
          ? 'opacity-40 cursor-not-allowed bg-gray-400 text-white/60'
          : 'opacity-90 bg-[#0066cc] text-white hover:opacity-100 cursor-pointer'
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    </button>
  );
});

const MicButton = memo(({ 
  isListening,
  onToggleListen,
  disabled
}: { isListening?: boolean; onToggleListen?: (e: React.MouseEvent) => void; disabled?: boolean }) => {
  if (!onToggleListen) return null;
  
  return (
    <button
      type="button"
      onClick={onToggleListen}
      disabled={disabled}
      className={`ml-auto self-center h-8 w-8 shrink-0 flex items-center justify-center rounded-full border-0 p-0 transition-all z-20 cursor-pointer ${
        disabled
          ? 'opacity-40 cursor-not-allowed text-gray-400'
          : isListening 
            ? 'bg-red-500 text-white animate-pulse' 
            : 'bg-black/5 text-ink hover:bg-black/10'
      }`}
      title="Voice Type"
    >
      <Mic className="w-4 h-4" />
    </button>
  );
});


const OptionsMenu = memo(({ 
  isOpen, 
  onSelect,
  menuOptions,
  selectedId
}: any) => {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 bg-canvas/90 backdrop-blur-md rounded-xl shadow-lg border border-hairline overflow-hidden z-30 min-w-[220px] animate-fade-in-up">
      <ul className="py-1 m-0 list-none p-0">
        {menuOptions.map((option: any) => (
          <li
            key={option.id}
            className={`px-4 py-3 flex items-center gap-3 cursor-pointer text-sm font-medium transition-colors ${
              selectedId === option.id ? "bg-primary/5 text-primary" : "text-ink hover:bg-black/5"
            }`}
            onClick={() => onSelect(option.id)}
          >
            <span className="text-lg flex items-center justify-center">{option.icon}</span>
            <span>{option.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});

const InputArea = memo(({ 
  value,
  setValue,
  placeholder,
  handleKeyDown,
  disabled,
  isSubmitDisabled,
  textColor,
  isListening,
  onToggleListen
}: InputAreaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = 22;
      const maxHeight = lineHeight * 4 + 16;
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + "px";
    }
  }, [value]);
  
  return (
    <div className="flex-1 relative h-full flex items-center pl-2 pr-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Message Input"
        rows={1}
        className={`w-full min-h-[32px] max-h-24 bg-transparent text-sm font-normal text-left self-center text-[${textColor}] placeholder-ink-muted-48 border-0 outline-none px-2 py-1.5 z-20 relative resize-none`}
        style={{
          fontFamily: 'inherit',
          letterSpacing: "-0.14px",
          lineHeight: "22px",
          scrollbarWidth: "none"
        }}
        disabled={disabled}
      />
      <MicButton isListening={isListening} onToggleListen={onToggleListen} disabled={disabled} />
      <SendButton isDisabled={isSubmitDisabled} />
    </div>
  );
});

const MenuButton = memo(({ 
  toggleMenu,
  menuRef,
  isMenuOpen,
  onSelectOption,
  textColor,
  menuOptions,
  selectedId
}: any) => {
  const selectedOption = menuOptions?.find((o: any) => o.id === selectedId);
  
  return (
    <div className="relative shrink-0 flex items-center pl-1" ref={menuRef}>
      <button
        type="button"
        onClick={toggleMenu}
        aria-label="Menu options"
        className={`h-8 w-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-[${textColor}] transition-all cursor-pointer`}
      >
        {selectedOption ? selectedOption.icon : <Plus size={16} />}
      </button>
      <OptionsMenu 
        isOpen={isMenuOpen} 
        onSelect={onSelectOption} 
        menuOptions={menuOptions}
        selectedId={selectedId}
      />
    </div>
  );
});

export default function GemScribeInput({
  value,
  onChange,
  placeholder = "Chat to Gemscribe",
  onSubmit,
  disabled = false,
  isListening = false,
  onToggleListen,
  animationDuration = 300,
  textColor = "#1d1d1f",
  menuOptions = [],
  selectedOptionId,
  onSelectOption
}: ChatInputProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (value.trim() && onSubmit && !disabled) {
        onSubmit();
      }
    },
    [value, onSubmit, disabled]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const toggleMenu = useCallback(() => setIsMenuOpen(prev => !prev), []);

  const selectOption = useCallback((id: string) => {
    if (onSelectOption) onSelectOption(id);
    setIsMenuOpen(false);
  }, [onSelectOption]);

  const isSubmitDisabled = disabled || !value.trim();

  return (
    <form
      onSubmit={handleSubmit}
      className={`w-full max-w-[768px] mx-auto transition-all duration-${animationDuration} ease-out relative z-50`}
    >
      <div
        ref={containerRef}
        className={`relative flex flex-col w-full min-h-[48px] bg-canvas-parchment border border-hairline rounded-[24px] p-1.5 overflow-visible transition-all duration-${animationDuration} group`}
        style={{
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
        }}
      >
        <div className="flex items-center relative z-20 w-full min-h-[32px]">
          {menuOptions.length > 0 && (
            <MenuButton
              toggleMenu={toggleMenu}
              menuRef={menuRef}
              isMenuOpen={isMenuOpen}
              onSelectOption={selectOption}
              textColor={textColor}
              menuOptions={menuOptions}
              selectedId={selectedOptionId}
            />
          )}
          
          <InputArea
            value={value}
            setValue={onChange}
            placeholder={placeholder}
            handleKeyDown={handleKeyDown}
            disabled={disabled}
            isSubmitDisabled={isSubmitDisabled}
            textColor={textColor}
            isListening={isListening}
            onToggleListen={onToggleListen}
          />
        </div>
      </div>
    </form>
  );
}
