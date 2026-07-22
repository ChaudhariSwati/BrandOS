import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const variants = {
  success: { icon: '✓', color: '#06d6a0', bg: '#e8faf4' },
  error: { icon: '✕', color: '#e03333', bg: '#ffe0e0' },
  info: { icon: 'ℹ', color: '#118ab2', bg: '#e0f0f8' },
  warning: { icon: '⚠', color: '#ffb703', bg: '#fff8e0' },
};

export default function Toast({ message, type = 'info', onClose, duration = 5000 }) {
  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const v = variants[type] || variants.info;

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="toast"
          initial={{ opacity: 0, y: -20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -20, x: '-50%' }}
          style={{ background: v.bg, borderColor: v.color }}
          role="alert"
        >
          <span className="toast-icon" style={{ color: v.color }}>{v.icon}</span>
          <span className="toast-message">{message}</span>
          <button className="toast-close" onClick={onClose} aria-label="Dismiss notification">✕</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Simple toast state management
let toastListeners = [];
let toastId = 0;

export function showToast(message, type = 'info', duration = 5000) {
  const id = ++toastId;
  const toast = { id, message, type, duration };
  toastListeners.forEach((fn) => fn(toast));
  return id;
}

export function addToastListener(listener) {
  toastListeners.push(listener);
  return () => {
    toastListeners = toastListeners.filter((l) => l !== listener);
  };
}

