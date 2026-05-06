'use client';

const GRPC_OVERRIDE_KEY = 'ZERA_GRPC_ENDPOINT_OVERRIDE';

export function getGrpcEndpointOverride(): string | null {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_ZERA_GRPC_ENDPOINT || null;
  }

  return (
    localStorage.getItem(GRPC_OVERRIDE_KEY) ||
    process.env.NEXT_PUBLIC_ZERA_GRPC_ENDPOINT ||
    null
  );
}

export function setGrpcEndpointOverride(endpoint: string): void {
  if (typeof window === 'undefined') return;

  const trimmed = endpoint.trim();
  if (!trimmed) {
    localStorage.removeItem(GRPC_OVERRIDE_KEY);
    return;
  }

  localStorage.setItem(GRPC_OVERRIDE_KEY, trimmed);
}

export function getGrpcConfig(): { endpoint?: string } {
  const endpoint = getGrpcEndpointOverride();
  return endpoint ? { endpoint } : {};
}
