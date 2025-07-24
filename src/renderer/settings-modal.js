window.SettingsModal = (function () {
  let settingsModal;
  let assemblyaiKeyInput;
  let slackTokenInput;
  let slackChannelInput;
  let summaryPromptInput;
  let closeBtn;
  let saveBtn;
  let isInitialized = false;

  async function initializeModal() {
    if (isInitialized) return;

    const container = document.getElementById('settingsModalContainer');
    const response = await fetch('./settings-modal.html');
    const html = await response.text();
    container.innerHTML = html;

    settingsModal = document.getElementById('settingsModal');
    assemblyaiKeyInput = document.getElementById('assemblyaiKey');
    slackTokenInput = document.getElementById('slackToken');
    slackChannelInput = document.getElementById('slackChannel');
    summaryPromptInput = document.getElementById('summaryPrompt');
    closeBtn = document.getElementById('closeBtn');
    saveBtn = document.getElementById('saveBtn');

    setupSettingsModalEvents();
    isInitialized = true;
  }

  async function showSettingsModal() {
    await initializeModal();
    settingsModal.classList.add('active');
    loadSettings();
  }

  function hideSettingsModal() {
    settingsModal.classList.remove('active');
  }

  async function loadSettings() {
    try {
      const settings = await window.electronAPI.getSettings();
      assemblyaiKeyInput.value = settings.assemblyaiKey || '';
      slackTokenInput.value = settings.slackToken || '';
      slackChannelInput.value = settings.slackChannel || '';
      summaryPromptInput.value =
        settings.summaryPrompt ||
        'Please provide a concise summary of this transcription, highlighting key points, decisions made, and action items discussed.';
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async function saveSettings() {
    try {
      const settings = {
        assemblyaiKey: assemblyaiKeyInput.value,
        slackToken: slackTokenInput.value,
        slackChannel: slackChannelInput.value,
        summaryPrompt: summaryPromptInput.value,
      };

      await window.electronAPI.saveSettings(settings);
      alert('Settings saved successfully!');
      hideSettingsModal();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings: ' + error.message);
    }
  }

  function setupSettingsModalEvents() {
    if (!closeBtn || !saveBtn || !settingsModal) return;
    closeBtn.addEventListener('click', hideSettingsModal);
    saveBtn.addEventListener('click', saveSettings);

    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        hideSettingsModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && settingsModal.classList.contains('active')) {
        hideSettingsModal();
      }
    });
  }

  return {
    showSettingsModal,
    hideSettingsModal,
  };
})();
