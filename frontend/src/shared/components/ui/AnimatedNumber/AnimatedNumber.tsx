import React, { useEffect, useState, useRef } from 'react';

interface AnimatedNumberProps {
  value: number | string;
  duration?: number;
  className?: string;
  decimals?: number;
  formatFn?: (value: number) => string;
  valueType?: 'number' | 'currency' | 'percentage';
}

/**
 * AnimatedNumber component that animates from 0 to the target number
 * Handles both numeric values and formatted strings (currency, percentages)
 */
const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 1500,
  className = '',
  decimals = 0,
  formatFn,
  valueType,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const previousValueRef = useRef<number>(0);

  // Extract numeric value from string (handles currency, percentages, etc.)
  const extractNumericValue = (val: number | string): number => {
    if (typeof val === 'number') {
      return val;
    }
    
    // Remove currency symbols, commas, spaces, and percentage signs
    const cleaned = val.toString().replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const numericValue = typeof value === 'number' ? value : extractNumericValue(value);

  useEffect(() => {
    // Cancel any existing animation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Reset animation when value changes
    const shouldAnimate = previousValueRef.current !== numericValue;
    
    if (shouldAnimate) {
      startTimeRef.current = null;
      setDisplayValue(0);
      previousValueRef.current = numericValue;
    }

    // Start animation from 0 to target value
    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = numericValue * easeOut;

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(numericValue);
      }
    };

    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [numericValue, duration]);

  // Format the display value
  const formatDisplayValue = (val: number): string => {
    // Use custom format function if provided
    if (formatFn) {
      return formatFn(val);
    }
    
    // Handle percentage type
    if (valueType === 'percentage') {
      return `${val.toFixed(decimals || 2)}%`;
    }
    
    // Handle currency type (fallback formatting)
    if (valueType === 'currency') {
      const formatted = val.toFixed(decimals || 2);
      return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    // Default number formatting
    const formatted = val.toFixed(decimals);
    // Add thousand separators for large numbers
    return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <span className={className}>
      {formatDisplayValue(displayValue)}
    </span>
  );
};

export default AnimatedNumber;

