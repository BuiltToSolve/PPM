'use client';

import { useState, useEffect } from 'react';

export default function Toast({ message, onDone }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!message) return null;

  return <div className="toast">{message}</div>;
}
