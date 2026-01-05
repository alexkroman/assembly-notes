// Component props types

// Modal component props
export interface SettingsModalProps {
  onClose: () => void;
}

export interface PromptModalProps {
  onClose: () => void;
}

// List and view component props
export interface RecordingsListProps {
  onNavigateToRecording: (recordingId?: string) => void;
}

export interface RecordingViewProps {
  recordingId: string | null;
  onNavigateToList: () => void;
  onShowPromptModal: () => void;
  isStoppingForNavigation?: boolean;
}
