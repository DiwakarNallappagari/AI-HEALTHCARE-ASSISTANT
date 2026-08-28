/**
 * Loading Spinner Component
 * Animated loading indicator with optional text
 */
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizeMap = { sm: 20, md: 36, lg: 48 };
  const dimension = sizeMap[size] || sizeMap.md;

  return (
    <div className="spinner-container">
      <div className="spinner" style={{ width: dimension, height: dimension }}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring spinner-ring-2"></div>
        <div className="spinner-dot"></div>
      </div>
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
