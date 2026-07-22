import { useMemo } from 'react';
import { motion } from 'framer-motion';

const requirements = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Number', test: (p) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function PasswordStrengthIndicator({ password }) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '', percent: 0 };
    const passed = requirements.filter((r) => r.test(password)).length;
    const percent = (passed / requirements.length) * 100;
    if (percent <= 20) return { score: 1, label: 'Very Weak', color: '#e03333', percent };
    if (percent <= 40) return { score: 2, label: 'Weak', color: '#ff6b35', percent };
    if (percent <= 60) return { score: 3, label: 'Fair', color: '#ffb703', percent };
    if (percent <= 80) return { score: 4, label: 'Strong', color: '#06d6a0', percent };
    return { score: 5, label: 'Very Strong', color: '#118ab2', percent };
  }, [password]);

  if (!password) return null;

  return (
    <div className="password-strength" role="status" aria-label={`Password strength: ${strength.label}`}>
      <div className="strength-bar-track">
        <motion.div
          className="strength-bar-fill"
          initial={{ width: 0, backgroundColor: '#e0e0e0' }}
          animate={{ width: `${strength.percent}%`, backgroundColor: strength.color }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      <span className="strength-label" style={{ color: strength.color }}>
        {strength.label}
      </span>
      <ul className="strength-requirements" aria-label="Password requirements">
        {requirements.map((req) => {
          const passed = req.test(password);
          return (
            <li key={req.label} className={passed ? 'req-passed' : 'req-failed'}>
              <span className="req-icon">{passed ? '✓' : '○'}</span>
              <span>{req.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

