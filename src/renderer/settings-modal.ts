let settingsModal: HTMLElement;
let assemblyaiKeyInput: HTMLInputElement;
let summaryPromptInput: HTMLTextAreaElement;
let closeBtn: HTMLButtonElement;
let saveBtn: HTMLButtonElement;
let isInitialized: boolean = false;

async function initializeModal(): Promise<void> {
  if (isInitialized) return;

  const container = document.getElementById('settingsModalContainer')!;
  const response = await fetch('./settings-modal.html');
  const html = await response.text();
  container.innerHTML = html;

  settingsModal = document.getElementById('settingsModal')!;
  assemblyaiKeyInput = document.getElementById('assemblyaiKey') as HTMLInputElement;
  summaryPromptInput = document.getElementById('summaryPrompt') as HTMLTextAreaElement;
  closeBtn = document.getElementById('closeBtn') as HTMLButtonElement;
  saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;

  setupSettingsModalEvents();
  isInitialized = true;
}

export async function showSettingsModal(): Promise<void> {
  await initializeModal();
  settingsModal.classList.add('active');
  loadSettings();
}

function hideSettingsModal(): void {
  settingsModal.classList.remove('active');
}

async function loadSettings(): Promise<void> {
  try {
    const settings = await window.electronAPI.getSettings();
    assemblyaiKeyInput.value = settings.assemblyaiKey || '';
    summaryPromptInput.value = settings.summaryPrompt || '';
  } catch (error: any) {
    console.error('Error loading settings:', error);
  }
}

async function saveSettings(): Promise<void> {
  try {
    const settings = {
      assemblyaiKey: assemblyaiKeyInput.value,
      summaryPrompt: summaryPromptInput.value.trim(),
    };

    await window.electronAPI.saveSettings(settings);
    alert('Settings saved successfully!');
    hideSettingsModal();
  } catch (error: any) {
    console.error('Error saving settings:', error);
    alert('Error saving settings: ' + error.message);
  }
}

function setupSettingsModalEvents(): void {
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