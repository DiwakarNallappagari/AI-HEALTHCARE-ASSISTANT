/**
 * GoogleSignInButton Component
 * Integrates Google Identity Services (GIS) for real Google Sign-In
 */
import { useEffect, useRef, useState } from 'react';

const GoogleSignInButton = ({ onSuccess, onError, disabled, text = 'continue_with' }) => {
  const buttonRef = useRef(null);
  const [configError, setConfigError] = useState(false);
  const [loading, setLoading] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const isConfigured = Boolean(
    clientId &&
    clientId !== 'your_google_oauth_client_id' &&
    clientId.trim() !== ''
  );

  useEffect(() => {
    if (!isConfigured) {
      setConfigError(true);
      return;
    }

    let isMounted = true;

    const initGoogleAuth = () => {
      if (!window.google?.accounts?.id) {
        return false;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (!response.credential) {
              if (onError) onError('No Google credential returned');
              return;
            }

            if (isMounted) setLoading(true);
            try {
              if (onSuccess) {
                await onSuccess(response.credential);
              }
            } catch (err) {
              if (onError) onError(err);
            } finally {
              if (isMounted) setLoading(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (buttonRef.current) {
          buttonRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: text,
            shape: 'rectangular',
            logo_alignment: 'left',
            width: '100%',
          });
        }
        return true;
      } catch (err) {
        console.error('Google Identity initialization error:', err);
        if (isMounted) setConfigError(true);
        return false;
      }
    };

    if (!initGoogleAuth()) {
      const interval = setInterval(() => {
        if (initGoogleAuth()) {
          clearInterval(interval);
        }
      }, 300);

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [clientId, isConfigured, onSuccess, onError, text]);

  const handleCustomClick = () => {
    if (!isConfigured) {
      if (onError) {
        onError('Google Client ID is not configured. Please add VITE_GOOGLE_CLIENT_ID to frontend/.env');
      }
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // If prompt was dismissed or skipped, user can click rendered button
          console.log('GIS prompt status:', notification.getNotDisplayedReason() || notification.getSkippedReason());
        }
      });
    }
  };

  if (configError || !isConfigured) {
    return (
      <div className="google-config-error">
        <div className="google-config-error-icon">⚠️</div>
        <div className="google-config-error-text">
          <strong>Google Sign-In Not Configured</strong>
          <span>Please set a valid <code>VITE_GOOGLE_CLIENT_ID</code> in <code>frontend/.env</code></span>
        </div>
      </div>
    );
  }

  return (
    <div className="google-signin-wrapper">
      <div
        ref={buttonRef}
        className={`google-signin-container ${loading || disabled ? 'disabled' : ''}`}
        onClick={handleCustomClick}
      />
    </div>
  );
};

export default GoogleSignInButton;
