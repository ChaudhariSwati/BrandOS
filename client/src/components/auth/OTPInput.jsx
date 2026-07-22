import { useState, useRef, useCallback, useEffect } from 'react';

export default function OTPInput({ length = 6, onComplete, onValueChange, disabled = false }) {
  const [otp, setOtp] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = useCallback((index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    // If pasting multiple digits, fill from this position
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').split('').slice(0, length - index);
      digits.forEach((digit, i) => {
        if (index + i < length) newOtp[index + i] = digit;
      });
      setOtp(newOtp);
      onValueChange?.(newOtp.join(''));

      // Focus the next empty input or last input
      const nextEmpty = newOtp.findIndex((d) => !d);
      const focusIndex = nextEmpty === -1 ? length - 1 : nextEmpty;
      inputRefs.current[focusIndex]?.focus();

      if (newOtp.every((d) => d)) {
        onComplete?.(newOtp.join(''));
      }
      return;
    }

    // Single digit input
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    onValueChange?.(newOtp.join(''));

    // Auto-focus next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newOtp.every((d) => d)) {
      onComplete?.(newOtp.join(''));
    }
  }, [otp, length, onComplete, onValueChange]);

  const handleKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Go back to previous input
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        onValueChange?.(newOtp.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        onValueChange?.(newOtp.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp, length, onValueChange]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain');
    const digits = pastedData.replace(/\D/g, '').split('').slice(0, length);
    const newOtp = [...otp];
    digits.forEach((digit, i) => {
      newOtp[i] = digit;
    });
    setOtp(newOtp);
    onValueChange?.(newOtp.join(''));

    const focusIndex = digits.length < length ? digits.length : length - 1;
    inputRefs.current[focusIndex]?.focus();

    if (newOtp.every((d) => d)) {
      onComplete?.(newOtp.join(''));
    }
  }, [otp, length, onComplete, onValueChange]);

  return (
    <div className="otp-input-group" role="group" aria-label="One-time password input">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length}
          className="otp-input-box"
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}

