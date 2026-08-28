export function estimateBytes(value: unknown): number {
  if (typeof value === "string") return utf8Bytes(value);
  if (value instanceof ArrayBuffer) return value.byteLength;
  if (ArrayBuffer.isView(value)) return value.byteLength;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) return value.byteLength;

  try {
    const encoded = JSON.stringify(value);
    return encoded ? utf8Bytes(encoded) : 0;
  } catch {
    return 0;
  }
}

function utf8Bytes(value: string): number {
  if (typeof Buffer !== "undefined") return Buffer.byteLength(value);
  return new TextEncoder().encode(value).byteLength;
}

export function safeCount(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && (value as number) >= 0 ? value as number : fallback;
}
