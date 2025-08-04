import 'reflect-metadata';
import { container } from 'tsyringe';

/**
 * Reset the DI container for tests
 * This ensures each test gets a fresh container state
 */
export function resetTestContainer(): void {
  // Clear all instances
  container.clearInstances();

  // Reset the container to remove all registrations
  container.reset();
}

/**
 * Register a mock in the container, overriding any existing registration
 */
export function registerMock(token: any, mock: any): void {
  // First, clear any existing registration
  container.clearInstances();

  // Register the mock
  container.register(token, {
    useValue: mock,
  });
}
