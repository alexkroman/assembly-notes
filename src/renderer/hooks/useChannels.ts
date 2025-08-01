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
    // Parse favorite channel names from comma-delimited string
    const favoriteChannelNames = settings.slackChannels
      ? settings.slackChannels
          .split(',')
          .map((name) => name.trim().toLowerCase())
          .filter(Boolean)
      : [];

    // Create simple channel objects from the favorite names
    // In the simplified approach, we just use the names directly
    const favoriteChannels: SlackChannel[] = favoriteChannelNames.map(
      (name) => ({
        id: name, // Use name as ID for simplicity
        name: name,
        isPrivate: false, // We can't determine this from just the name
      })
    );

    setChannels(favoriteChannels);
  }, [settings.slackChannels]);

  const handleChannelChange = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  const selectedChannel = channels.find((ch) => ch.id === selectedChannelId);

  return {
    channels,
    selectedChannel,
    selectedChannelId,
    handleChannelChange,
  };
};
