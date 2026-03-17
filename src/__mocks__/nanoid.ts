let counter = 0;
export function nanoid(): string {
  return `mock-id-${++counter}-${Date.now()}`;
}
