// Type declarations for electron-redux modules

declare module 'electron-redux/es/main.js' {
  export function stateSyncEnhancer(): any;
  export function replayActionMain(store: any): any;
  export function syncRendererToMain(store: any): any;
}

declare module 'electron-redux/es/preload.js' {
  export function preload(): void;
}

declare module 'electron-redux/es/renderer.js' {
  export function stateSyncEnhancer(): any;
}
