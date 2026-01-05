let callCount = 0;

export function v4(): string {
  callCount++;
  // Format: 8-4-4-4-12 = 36 chars (real UUID format)
  const hex = callCount.toString(16).padStart(4, '0');
  return `00000000-0000-4000-8000-00000000${hex}`;
}

export function v1(): string {
  return 'test-uuid-v1-1234-5678-9abc-def012345678';
}

export function v3(): string {
  return 'test-uuid-v3-1234-5678-9abc-def012345678';
}

export function v5(): string {
  return 'test-uuid-v5-1234-5678-9abc-def012345678';
}

export function validate(): boolean {
  return true;
}

export function version(): number {
  return 4;
}

export const NIL = '00000000-0000-0000-0000-000000000000';
export const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

export default {
  v4,
  v1,
  v3,
  v5,
  validate,
  version,
  NIL,
  MAX,
};
