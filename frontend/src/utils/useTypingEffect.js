import { useState, useEffect, useRef } from 'react';

const useTypingEffect = (text, speed = 100, delay = 0) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset when text changes
    setDisplayText('');
    setCurrentIndex(0);
    setIsDeleting(false);
    setIsComplete(false);
  }, [text]);

  useEffect(() => {
    const type = () => {
      if (isComplete) return;

      if (isDeleting) {
        // Deleting phase
        if (displayText.length > 0) {
          setDisplayText(prev => prev.slice(0, -1));
        } else {
          setIsDeleting(false);
          setIsComplete(true);
        }
      } else {
        // Typing phase
        if (currentIndex < text.length) {
          setDisplayText(prev => prev + text[currentIndex]);
          setCurrentIndex(prev => prev + 1);
        } else {
          // Finished typing
          setIsComplete(true);
        }
      }
    };

    // Apply delay for initial typing
    const delayTimeout = setTimeout(() => {
      timeoutRef.current = setTimeout(type, isDeleting ? speed / 2 : speed);
    }, delay);

    return () => {
      clearTimeout(delayTimeout);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [displayText, currentIndex, isDeleting, text, speed, delay, isComplete]);

  return { displayText, isComplete };
};

export default useTypingEffect;