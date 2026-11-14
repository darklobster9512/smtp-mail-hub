declare module "cloudflare:sockets" {
  export function connect(address: { hostname: string; port: number } | string, options?: { secureTransport?: "off" | "on" | "starttls"; allowHalfOpen?: boolean }): {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
    opened: Promise<unknown>;
    closed: Promise<void>;
    close(): Promise<void>;
    startTls(options?: { expectedServerHostname?: string }): ReturnType<typeof connect>;
  };
}
