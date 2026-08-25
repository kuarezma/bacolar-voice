export interface NetworkConfig {
  port: number;
  bindHost: string;
}

export function resolveNetworkConfig(environment: NodeJS.ProcessEnv = process.env): NetworkConfig {
  const rawPort = environment.PORT?.trim() || '3001';
  const port = Number(rawPort);

  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT 1 ile 65535 arasında geçerli bir tam sayı olmalıdır.');
  }

  return {
    port,
    bindHost: environment.BACOLAR_BIND_HOST?.trim() || '0.0.0.0'
  };
}
