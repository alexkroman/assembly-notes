import React, { useEffect, useState, useRef } from 'react';

import { useAppSelector } from '../hooks/redux.js';

interface SlackOAuthSectionProps {
  onValidationChange?: (isValid: boolean, hasUnsavedChanges: boolean) => void;
}

export const SlackOAuthSection: React.FC<SlackOAuthSectionProps> = ({
  onValidationChange,
}) => {
  const settings = useAppSelector((state) => state.settings);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localChannelValue, setLocalChannelValue] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentInstallation = settings.slackInstallation;

  // Initialize local channel value from settings and trigger validation if needed
  useEffect(() => {
    const channelValue = settings.slackChannels || '';
    setLocalChannelValue(channelValue);

    // If we have existing channel data, trigger validation on mount
    if (currentInstallation && channelValue.trim()) {
      setIsValidating(true);

      const validateExistingChannels = async () => {
        try {
          await window.electronAPI.slackOAuthValidateChannels(
            currentInstallation.teamId,
            channelValue
          );
          setError(null);
          setIsValidating(false);
        } catch (validationErr) {
          const errorMessage =
            validationErr instanceof Error
              ? validationErr.message
              : 'Channel validation failed';
          setError(errorMessage);
          setIsValidating(false);
        }
      };

      void validateExistingChannels();
    }
  }, [settings.slackChannels, currentInstallation]);

  // Notify parent about validation status
  useEffect(() => {
    const hasUnsavedChanges =
      localChannelValue !== (settings.slackChannels || '');
    const isValid = !error && !isValidating;
    onValidationChange?.(isValid, hasUnsavedChanges);
  }, [
    error,
    isValidating,
    localChannelValue,
    settings.slackChannels,
    onValidationChange,
  ]);

  useEffect(() => {
    // Listen for OAuth success/error events
    const handleOAuthSuccess = () => {
      setIsConnecting(false);
      setError(null);
      // Settings will be updated automatically via Redux
    };

    const handleOAuthError = (errorMessage: string) => {
      setIsConnecting(false);
      setError(errorMessage);
    };

    window.electronAPI.onSlackOAuthSuccess(handleOAuthSuccess);
    window.electronAPI.onSlackOAuthError(handleOAuthError);

    // Cleanup listeners on unmount
    return () => {
      // Clear any pending validation timeout
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      // Note: electronAPI doesn't expose removeListener, so we rely on component unmount
    };
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      await window.electronAPI.slackOAuthInitiate();
    } catch (err) {
      setIsConnecting(false);
      setError(err instanceof Error ? err.message : 'Failed to initiate OAuth');
    }
  };

  const handleDisconnect = async () => {
    if (!currentInstallation) return;
    try {
      await window.electronAPI.slackOAuthRemoveInstallation();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  const handleChannelListChange = (channelList: string) => {
    // Update local state immediately for responsive UI
    setLocalChannelValue(channelList);

    // Clear any existing validation timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Clear previous validation errors while typing
    setError(null);
    setIsValidating(false);

    // Set up debounced validation and save (validate and save 1 second after user stops typing)
    if (currentInstallation && channelList.trim()) {
      setIsValidating(true);
      validationTimeoutRef.current = setTimeout(() => {
        // Wrap the async validation and save in a function that handles errors properly
        const validateAndSaveChannels = async () => {
          try {
            // First validate the channels
            await window.electronAPI.slackOAuthValidateChannels(
              currentInstallation.teamId,
              channelList
            );

            // If validation passes, then save
            await window.electronAPI.saveSettings({
              slackChannels: channelList,
            });

            // Success - validation passed and saved
            setError(null);
            setIsValidating(false);
          } catch (validationErr) {
            setError(
              validationErr instanceof Error
                ? validationErr.message
                : 'Channel validation failed'
            );
            // Reset local value to last known good value from settings on validation failure
            setLocalChannelValue(settings.slackChannels || '');
            setIsValidating(false);
          }
        };

        // Call the validation and save function
        void validateAndSaveChannels();
      }, 1000); // Wait 1 second after user stops typing
    } else if (!channelList.trim()) {
      // If empty, save immediately without validation
      const saveEmptyChannels = async () => {
        try {
          await window.electronAPI.saveSettings({
            slackChannels: channelList,
          });
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Failed to save channels'
          );
          // Reset local value on save failure
          setLocalChannelValue(settings.slackChannels || '');
        }
      };
      void saveEmptyChannels();
    }
  };

  if (!currentInstallation) {
    return (
      <div className="slack-oauth-section">
        <button
          type="button"
          className="btn-primary oauth-button"
          onClick={() => {
            void handleConnect();
          }}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect to Slack'}
        </button>
        {error && (
          <div
            className="error-message"
            style={{ color: '#ff4444', fontSize: '12px', marginTop: '8px' }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="slack-oauth-section">
      <div
        className="oauth-actions"
        style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}
      >
        <button
          type="button"
          className="btn-small btn-danger"
          onClick={() => {
            void handleDisconnect();
          }}
        >
          Disconnect from Slack
        </button>
      </div>

      <div className="form-group" style={{ marginBottom: '12px' }}>
        <label
          htmlFor="slack-channels-textarea"
          style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}
        >
          Favorite Channels (comma-separated):
        </label>
        <textarea
          id="slack-channels-textarea"
          value={localChannelValue}
          onChange={(e) => {
            handleChannelListChange(e.target.value);
          }}
          placeholder="general, random, team-updates"
          rows={3}
          style={{
            width: '100%',
            padding: '4px 8px',
            fontSize: '12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
          Enter channel names without # symbol. Bot must be invited to private
          channels.
        </div>
      </div>

      {error && (
        <div
          className="error-message"
          style={{ color: '#ff4444', fontSize: '12px', marginTop: '8px' }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
