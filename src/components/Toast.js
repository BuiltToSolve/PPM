'use client';

import { useEffect, useRef } from 'react';

export default function Toast({ message, onDone, type = 'info' }) {
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      if (onDoneRef.current) {
        onDoneRef.current();
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  const isError = type === 'error' || /error|failed|invalid|cannot|forbidden/i.test(message);

  return (
    <div className={`toast ${isError ? 'toast-error' : ''}`}>
      {message}
    </div>
  );
}
