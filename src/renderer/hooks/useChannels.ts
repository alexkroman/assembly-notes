import { useEffect, useState } from 'react';

import { useAppSelector } from './redux.js';
export const useChannels = () => {
  const settings = useAppSelector((state) => state.settings);
  const [channels, setChannels] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');

  useEffect(() => {
    const channelsList = settings.slackChannels
      ? settings.slackChannels
          .split(',')
          .map((ch: string) => ch.trim())
          .filter((ch: string) => ch)
      : [];

    setChannels(channelsList);

    const savedChannel = settings.selectedSlackChannel;
    if (savedChannel && channelsList.includes(savedChannel)) {
      setSelectedChannel(savedChannel);
    } else if (channelsList.length > 0 && !savedChannel) {
      const firstChannel = channelsList[0];
      if (firstChannel) {
        setSelectedChannel(firstChannel);
        void window.electronAPI.saveSelectedChannel(firstChannel).catch(() => {
          // Ignore channel save errors on initial load
        });
      }
    }
  }, [settings.slackChannels, settings.selectedSlackChannel]);

  const handleChannelChange = async (channel: string) => {
    setSelectedChannel(channel);
    if (channel) {
      try {
        await window.electronAPI.saveSelectedChannel(channel);
      } catch (error) {
        console.error('Error saving selected channel:', error);
      }
    }
  };

  return {
    channels,
    selectedChannel,
    handleChannelChange,
  };
};
