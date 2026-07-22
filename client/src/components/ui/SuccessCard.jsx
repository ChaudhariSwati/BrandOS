import { motion } from 'framer-motion';

export default function SuccessCard({ title, description, actionLabel, onAction, secondaryLabel, onSecondary }) {
  return (
    <motion.div
      className="success-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Animated checkmark */}
      <div className="success-checkmark">
        <motion.svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.circle
            cx="32" cy="32" r="30"
            fill="none"
            stroke="#06d6a0"
            strokeWidth="4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4 }}
          />
          <motion.path
            d="M20 32l8 8 16-16"
            fill="none"
            stroke="#06d6a0"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          />
        </motion.svg>
      </div>

      <h2 className="success-title">{title}</h2>
      {description && <p className="success-description">{description}</p>}

      <div className="success-actions">
        {actionLabel && onAction && (
          <button className="btn btn-primary" onClick={onAction} style={{ width: '100%' }}>
            {actionLabel}
          </button>
        )}
        {secondaryLabel && onSecondary && (
          <button className="btn btn-secondary" onClick={onSecondary} style={{ width: '100%' }}>
            {secondaryLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
}

