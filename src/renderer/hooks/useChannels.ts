import { useEffect, useState } from 'react';

import { useAppSelector } from './redux.js';

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
}

export const useChannels = () => {
  const settings = useAppSelector((state) => state.settings);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');

  useEffect(() => {
    // Get favorite channels from settings
    const availableChannels = settings.availableChannels;
    const favoriteChannelNames = settings.slackChannels
      ? settings.slackChannels
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean)
      : [];

    // Filter available channels to only show favorites
    const favoriteChannels =
      favoriteChannelNames.length > 0
        ? availableChannels.filter((channel) =>
            favoriteChannelNames.includes(channel.name)
          )
        : availableChannels; // Show all if no favorites selected

    setChannels(favoriteChannels);

    // Set selected channel
    const savedChannelId = settings.selectedChannelId;
    if (
      savedChannelId &&
      favoriteChannels.some((ch) => ch.id === savedChannelId)
    ) {
      setSelectedChannelId(savedChannelId);
    } else if (favoriteChannels.length > 0 && !savedChannelId) {
      // Auto-select first favorite channel
      const firstChannel = favoriteChannels[0];
      if (firstChannel) {
        setSelectedChannelId(firstChannel.id);
        // Save selection
        void window.electronAPI
          .saveSettings({
            selectedChannelId: firstChannel.id,
          })
          .catch(() => {
            // Ignore save errors on initial load
          });
      }
    }
  }, [
    settings.availableChannels,
    settings.selectedChannelId,
    settings.slackChannels,
  ]);

  const handleChannelChange = async (channelId: string) => {
    setSelectedChannelId(channelId);
    if (channelId) {
      try {
        await window.electronAPI.saveSettings({
          selectedChannelId: channelId,
        });
      } catch (error) {
        console.error('Error saving selected channel:', error);
      }
    }
  };

  const selectedChannel = channels.find((ch) => ch.id === selectedChannelId);

  return {
    channels,
    selectedChannel,
    selectedChannelId,
    handleChannelChange,
  };
};
