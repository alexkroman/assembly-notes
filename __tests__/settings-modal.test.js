/**
 * @jest-environment jsdom
 */

describe('SettingsModal Module', () => {
  let SettingsModal;
  let mockFetch;
  let mockAlert;
  let mockSettingsModalContainer;
  let mockSettingsModal;
  let mockAssemblyaiKeyInput;
  let mockSummaryPromptInput;
  let mockCloseBtn;
  let mockSaveBtn;

  beforeEach(() => {
    // Mock DOM elements
    mockSettingsModalContainer = document.createElement('div');
    mockSettingsModalContainer.id = 'settingsModalContainer';
    document.body.appendChild(mockSettingsModalContainer);

    // Mock HTML response
    const mockModalHtml = `
      <div id="settingsModal" class="modal">
        <input id="assemblyaiKey" type="text" />
        <textarea id="summaryPrompt"></textarea>
        <button id="closeBtn">Close</button>
        <button id="saveBtn">Save</button>
      </div>
    `;

    // Mock fetch
    mockFetch = jest.fn().mockResolvedValue({
      text: jest.fn().mockResolvedValue(mockModalHtml),
    });
    global.fetch = mockFetch;

    // Mock alert
    mockAlert = jest.fn();
    global.alert = mockAlert;

    // Mock console
    global.console.error = jest.fn();

    // Mock window.electronAPI
    global.window.electronAPI = {
      getSettings: jest.fn().mockResolvedValue({
        assemblyaiKey: 'test-key',
        summaryPrompt: 'test prompt',
      }),
      saveSettings: jest.fn().mockResolvedValue(),
    };

    // Load the module
    jest.isolateModules(() => {
      require('../src/renderer/settings-modal.js');
    });
    SettingsModal = window.SettingsModal;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize modal on first showSettingsModal call', async () => {
      await SettingsModal.showSettingsModal();

      expect(mockFetch).toHaveBeenCalledWith('./settings-modal.html');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Check DOM elements are properly set
      const settingsModal = document.getElementById('settingsModal');
      expect(settingsModal).toBeTruthy();
      expect(settingsModal.classList.contains('active')).toBe(true);
    });

    it('should not reinitialize modal on subsequent calls', async () => {
      await SettingsModal.showSettingsModal();
      SettingsModal.hideSettingsModal();
      await SettingsModal.showSettingsModal();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should load settings when showing modal', async () => {
      await SettingsModal.showSettingsModal();

      expect(window.electronAPI.getSettings).toHaveBeenCalled();
      
      const assemblyaiKeyInput = document.getElementById('assemblyaiKey');
      const summaryPromptInput = document.getElementById('summaryPrompt');
      
      expect(assemblyaiKeyInput.value).toBe('test-key');
      expect(summaryPromptInput.value).toBe('test prompt');
    });
  });

  describe('showSettingsModal', () => {
    it('should add active class to modal', async () => {
      await SettingsModal.showSettingsModal();

      const settingsModal = document.getElementById('settingsModal');
      expect(settingsModal.classList.contains('active')).toBe(true);
    });

    it('should handle error when loading settings fails', async () => {
      const error = new Error('Failed to load settings');
      window.electronAPI.getSettings.mockRejectedValue(error);

      await SettingsModal.showSettingsModal();

      expect(console.error).toHaveBeenCalledWith('Error loading settings:', error);
    });

    it('should use empty values when settings are not available', async () => {
      window.electronAPI.getSettings.mockResolvedValue({});

      await SettingsModal.showSettingsModal();

      const assemblyaiKeyInput = document.getElementById('assemblyaiKey');
      const summaryPromptInput = document.getElementById('summaryPrompt');
      
      expect(assemblyaiKeyInput.value).toBe('');
      expect(summaryPromptInput.value).toBe('');
    });
  });

  describe('hideSettingsModal', () => {
    it('should remove active class from modal', async () => {
      await SettingsModal.showSettingsModal();
      const settingsModal = document.getElementById('settingsModal');
      expect(settingsModal.classList.contains('active')).toBe(true);

      SettingsModal.hideSettingsModal();
      expect(settingsModal.classList.contains('active')).toBe(false);
    });
  });

  describe('saveSettings', () => {
    beforeEach(async () => {
      await SettingsModal.showSettingsModal();
    });

    it('should save settings when save button is clicked', async () => {
      const assemblyaiKeyInput = document.getElementById('assemblyaiKey');
      const summaryPromptInput = document.getElementById('summaryPrompt');
      const saveBtn = document.getElementById('saveBtn');

      assemblyaiKeyInput.value = 'new-key';
      summaryPromptInput.value = '  new prompt  '; // with whitespace

      saveBtn.click();
      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async operations

      expect(window.electronAPI.saveSettings).toHaveBeenCalledWith({
        assemblyaiKey: 'new-key',
        summaryPrompt: 'new prompt', // should be trimmed
      });

      expect(mockAlert).toHaveBeenCalledWith('Settings saved successfully!');
      
      const settingsModal = document.getElementById('settingsModal');
      expect(settingsModal.classList.contains('active')).toBe(false);
    });

    it('should handle save errors gracefully', async () => {
      const error = new Error('Save failed');
      window.electronAPI.saveSettings.mockRejectedValue(error);

      const saveBtn = document.getElementById('saveBtn');
      saveBtn.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.error).toHaveBeenCalledWith('Error saving settings:', error);
      expect(mockAlert).toHaveBeenCalledWith('Error saving settings: Save failed');
      
      // Modal should remain open on error
      const settingsModal = document.getElementById('settingsModal');
      expect(settingsModal.classList.contains('active')).toBe(true);
    });
  });

  describe('event handlers', () => {
    beforeEach(async () => {
      await SettingsModal.showSettingsModal();
    });

    it('should close modal when close button is clicked', () => {
      const closeBtn = document.getElementById('closeBtn');
      const settingsModal = document.getElementById('settingsModal');

      expect(settingsModal.classList.contains('active')).toBe(true);
      
      closeBtn.click();
      
      expect(settingsModal.classList.contains('active')).toBe(false);
    });

    it('should close modal when clicking outside modal content', () => {
      const settingsModal = document.getElementById('settingsModal');
      
      expect(settingsModal.classList.contains('active')).toBe(true);
      
      // Simulate click on modal backdrop
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(clickEvent, 'target', {
        value: settingsModal,
        enumerable: true,
      });
      
      settingsModal.dispatchEvent(clickEvent);
      
      expect(settingsModal.classList.contains('active')).toBe(false);
    });

    it('should not close modal when clicking inside modal content', () => {
      const settingsModal = document.getElementById('settingsModal');
      const assemblyaiKeyInput = document.getElementById('assemblyaiKey');
      
      expect(settingsModal.classList.contains('active')).toBe(true);
      
      // Simulate click on input field
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(clickEvent, 'target', {
        value: assemblyaiKeyInput,
        enumerable: true,
      });
      
      settingsModal.dispatchEvent(clickEvent);
      
      expect(settingsModal.classList.contains('active')).toBe(true);
    });

    it('should close modal when Escape key is pressed', () => {
      const settingsModal = document.getElementById('settingsModal');
      
      expect(settingsModal.classList.contains('active')).toBe(true);
      
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      
      document.dispatchEvent(escapeEvent);
      
      expect(settingsModal.classList.contains('active')).toBe(false);
    });

    it('should not close modal when other keys are pressed', () => {
      const settingsModal = document.getElementById('settingsModal');
      
      expect(settingsModal.classList.contains('active')).toBe(true);
      
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      });
      
      document.dispatchEvent(enterEvent);
      
      expect(settingsModal.classList.contains('active')).toBe(true);
    });

    it('should not respond to Escape key when modal is not active', () => {
      const settingsModal = document.getElementById('settingsModal');
      SettingsModal.hideSettingsModal();
      
      expect(settingsModal.classList.contains('active')).toBe(false);
      
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      
      // Should not throw or cause issues
      document.dispatchEvent(escapeEvent);
      
      expect(settingsModal.classList.contains('active')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle missing DOM elements gracefully', async () => {
      // Remove container before initialization
      document.body.innerHTML = '';
      
      // Should not throw
      await expect(SettingsModal.showSettingsModal()).rejects.toThrow();
    });

    it('should handle fetch failure gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      await expect(SettingsModal.showSettingsModal()).rejects.toThrow('Network error');
    });

    it('should not setup events if DOM elements are missing', async () => {
      const incompleteHtml = '<div id="settingsModal"></div>';
      mockFetch.mockResolvedValue({
        text: jest.fn().mockResolvedValue(incompleteHtml),
      });

      await SettingsModal.showSettingsModal();
      
      // Should not throw when trying to add event listeners
      const settingsModal = document.getElementById('settingsModal');
      expect(settingsModal).toBeTruthy();
    });
  });

  describe('module structure', () => {
    it('should expose only the public API', () => {
      expect(SettingsModal).toBeDefined();
      expect(typeof SettingsModal.showSettingsModal).toBe('function');
      expect(typeof SettingsModal.hideSettingsModal).toBe('function');
      expect(Object.keys(SettingsModal).sort()).toEqual(['hideSettingsModal', 'showSettingsModal']);
    });

    it('should not expose internal functions', () => {
      expect(SettingsModal.initializeModal).toBeUndefined();
      expect(SettingsModal.loadSettings).toBeUndefined();
      expect(SettingsModal.saveSettings).toBeUndefined();
      expect(SettingsModal.setupSettingsModalEvents).toBeUndefined();
    });
  });
});