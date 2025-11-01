import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDropdown } from '@/shared/contexts/DropdownContext';
import { createPortal } from 'react-dom';

export interface DropdownOption {
  value: string;
  label: string;
}

export interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  placement?: 'bottom' | 'top' | 'left' | 'right' | 'auto';
  maxHeight?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = '',
  disabled = false,
  id,
  placement = 'auto',
  maxHeight = '15rem',
}) => {
  const dropdownId = useMemo(() => id || `dropdown-${Math.random().toString(36).substr(2, 9)}`, [id]);
  const { openDropdownId, setOpenDropdownId, closeAllDropdowns } = useDropdown();
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const [alignment, setAlignment] = useState<'left' | 'right'>('left');
  const [calculatedMaxHeight, setCalculatedMaxHeight] = useState<string>(maxHeight);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const touchHandledRef = useRef(false);
  
  // Control open state manually - check if this dropdown is open
  const isOpen = openDropdownId === dropdownId;

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (optionValue: string, event?: React.MouseEvent | React.TouchEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Update the value immediately - this is critical for controlled component behavior
    // Call onChange first to ensure parent state updates before closing
    onChange(optionValue);
    
    // Close the dropdown immediately after selection
    // Using requestAnimationFrame to ensure onChange has been processed
    requestAnimationFrame(() => {
      closeAllDropdowns();
      setOpenDropdownId(null);
    });
  };

  const handleToggle = () => {
    if (isOpen) {
      closeAllDropdowns();
    } else {
      closeAllDropdowns();
      setOpenDropdownId(dropdownId);
    }
  };

  // Calculate position based on viewport
  const updatePosition = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    
    // Parse maxHeight to get numeric value for calculations
    let maxHeightValue: number;
    if (maxHeight.includes('rem')) {
      maxHeightValue = parseFloat(maxHeight.replace('rem', '')) * 16; // Convert rem to px
    } else if (maxHeight.includes('px')) {
      maxHeightValue = parseFloat(maxHeight.replace('px', ''));
    } else {
      // Default fallback if unit is not recognized
      maxHeightValue = 240; // 15rem * 16
    }
    const estimatedDropdownHeight = Math.min(maxHeightValue, options.length * 48); // ~48px per option
    
    let localCalculatedMaxHeight = maxHeight;
    let localPosition: 'bottom' | 'top' = 'bottom';
    let localAlignment: 'left' | 'right' = 'left';

    // Determine vertical position with better mobile logic
    if (placement === 'auto') {
      // On mobile, prefer bottom if there's enough space, otherwise use top
      if (viewportWidth < 640) {
        // On mobile: prefer bottom unless there's clearly not enough space below
        // AND positioning above won't cause overflow
        const needsMoreSpace = spaceBelow < estimatedDropdownHeight + 20; // Add padding
        const canFitAbove = spaceAbove >= estimatedDropdownHeight + 20; // Ensure dropdown won't overflow above
        const hasMoreSpaceAbove = spaceAbove > spaceBelow + 50; // Significant advantage to position above
        
        // Only position above if:
        // 1. There's not enough space below for the dropdown
        // 2. There IS enough space above for the dropdown (prevents overflow)
        // 3. Positioning above is significantly better
        if (needsMoreSpace && canFitAbove && hasMoreSpaceAbove && spaceAbove > 250) {
          localPosition = 'top';
          localCalculatedMaxHeight = maxHeight;
        } else {
          // Default to bottom, but ensure it doesn't overflow viewport
          localPosition = 'bottom';
          // Calculate dynamic max height to prevent viewport overflow
          const availableSpace = Math.max(spaceBelow - 20, 100); // Leave 20px padding
          const dynamicMaxHeight = Math.min(maxHeightValue, availableSpace);
          localCalculatedMaxHeight = `${dynamicMaxHeight}px`;
        }
      } else {
        // On desktop, use standard logic
        if (spaceBelow < estimatedDropdownHeight + 20 && spaceAbove > spaceBelow && spaceAbove >= estimatedDropdownHeight + 20) {
          localPosition = 'top';
          localCalculatedMaxHeight = maxHeight;
        } else {
          localPosition = 'bottom';
          // Calculate dynamic max height to prevent viewport overflow
          const availableSpace = Math.max(spaceBelow - 20, 100);
          const dynamicMaxHeight = Math.min(maxHeightValue, availableSpace);
          localCalculatedMaxHeight = `${dynamicMaxHeight}px`;
        }
      }
    } else if (placement === 'top' || placement === 'bottom') {
      localPosition = placement;
      localCalculatedMaxHeight = maxHeight;
    }

    setPosition(localPosition);
    setCalculatedMaxHeight(localCalculatedMaxHeight);

    // Determine horizontal alignment for small screens
    if (viewportWidth < 640) {
      const spaceLeft = buttonRect.left;
      const spaceRight = viewportWidth - buttonRect.right;
      // Align to prevent overflow - prefer right alignment on mobile for RTL
      if (spaceRight < 50) {
        localAlignment = 'right';
      } else if (spaceLeft < 50) {
        localAlignment = 'left';
      } else {
        localAlignment = 'left';
      }
    } else {
      localAlignment = 'left';
    }

    setAlignment(localAlignment);

    // Calculate absolute position for portal rendering
    const freshButtonRect = buttonRef.current.getBoundingClientRect();
    const buttonWidth = freshButtonRect.width;
    let top = 0;
    let left = 0;

    if (localPosition === 'top') {
      // Position above the button - use the calculated max height
      const maxHeightPx = localCalculatedMaxHeight.includes('px') 
        ? parseFloat(localCalculatedMaxHeight.replace('px', '')) 
        : parseFloat(localCalculatedMaxHeight.replace('rem', '')) * 16;
      top = freshButtonRect.top - maxHeightPx - 4;
    } else {
      // Position below the button
      top = freshButtonRect.bottom + 4;
    }

    if (localAlignment === 'right') {
      left = freshButtonRect.right - buttonWidth;
    } else {
      left = freshButtonRect.left;
    }

    setMenuPosition({ top, left, width: buttonWidth });
  };

  // Update position when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        updatePosition();
      });
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();
      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
        const target = e.target as HTMLElement;
        if (!buttonRef.current || buttonRef.current.contains(target)) {
          return; // Click is on the button itself
        }
        
        // Check if click is outside the dropdown menu
        const menuElement = document.querySelector(`[data-dropdown-menu-id="${dropdownId}"]`);
        if (!menuElement || !menuElement.contains(target)) {
          // Close the dropdown
          closeAllDropdowns();
        }
      };
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, dropdownId, closeAllDropdowns]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        data-dropdown-id={dropdownId}
        onClick={handleToggle}
        className={`
          relative w-full rounded-lg border border-slate-200/50 bg-white/90 px-4 py-3 text-sm font-medium shadow-md backdrop-blur-xl 
          transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          dark:bg-slate-800/90 dark:border-slate-700/50
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={placeholder}
      >
        <div className="flex items-center justify-between">
          <span className="truncate text-right">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`ml-2 h-4 w-4 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {isOpen && typeof window !== 'undefined' && createPortal(
              <div
                data-dropdown-menu-id={dropdownId}
                className="fixed z-[9999] rounded-lg border border-slate-200/50 bg-white/95 shadow-xl backdrop-blur-xl 
                  dark:border-slate-700/50 dark:bg-slate-800/95
                  overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                style={{
                  top: `${menuPosition.top}px`,
                  left: `${menuPosition.left}px`,
                  width: `${menuPosition.width}px`,
                  maxHeight: calculatedMaxHeight,
                  maxWidth: 'calc(100vw - 2rem)',
                }}
                role="listbox"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <div 
                  className="overflow-y-auto overscroll-contain custom-scrollbar" 
                  style={{ maxHeight: calculatedMaxHeight }}
                >
                  {options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={(e) => {
                        // Skip if this was already handled by touch
                        if (touchHandledRef.current) {
                          touchHandledRef.current = false;
                          return;
                        }
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(option.value, e);
                      }}
                      onMouseDown={(e) => {
                        // Prevent default to avoid double-firing on some browsers
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onTouchStart={(e) => {
                        // Mark that we're handling a touch event
                        touchHandledRef.current = true;
                      }}
                      onTouchEnd={(e) => {
                        // Handle touch events separately
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(option.value, e);
                        // Reset flag after a small delay
                        setTimeout(() => {
                          touchHandledRef.current = false;
                        }, 300);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.classList.add('bg-slate-100', 'dark:bg-slate-700');
                      }}
                      onMouseLeave={(e) => {
                        if (value !== option.value) {
                          e.currentTarget.classList.remove('bg-slate-100', 'dark:bg-slate-700');
                        }
                      }}
                      className={`
                        w-full px-4 py-3 text-right text-sm transition-colors duration-150 touch-manipulation cursor-pointer
                        ${value === option.value
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium' 
                          : 'text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }
                      `}
                      role="option"
                      aria-selected={value === option.value}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>,
              document.body
            )}
    </div>
  );
};

export default CustomDropdown;
