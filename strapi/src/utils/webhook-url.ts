import { isIP } from 'node:net';

export type WebhookValidationCode =
  | 'ok'
  | 'empty_url'
  | 'invalid_url'
  | 'invalid_protocol'
  | 'https_required'
  | 'credentials_not_allowed'
  | 'host_not_allowed'
  | 'localhost_not_allowed'
  | 'private_network_not_allowed';

export interface WebhookSecurityConfig {
  httpsOnly: boolean;
  allowPrivateNetworks: boolean;
  allowLocalhost: boolean;
  allowedHosts: string[];
}

export interface WebhookValidationResult {
  valid: boolean;
  code: WebhookValidationCode;
  message: string;
  normalizedUrl: string | null;
  hostname: string | null;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, '');
}

function normalizeHostPattern(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = normalizeHostname(value);
  if (!normalized) {
    return null;
  }

  if (normalized === '*') {
    return normalized;
  }

  const maybeWildcard = normalized.startsWith('*.') ? normalized.slice(2) : normalized;
  if (!maybeWildcard) {
    return null;
  }

  const strippedIp = stripIpv6Brackets(maybeWildcard);
  if (isIP(strippedIp)) {
    return normalized;
  }

  // Domain label format (ASCII only): keeps config strict and predictable.
  if (!/^[a-z0-9.-]+$/.test(maybeWildcard)) {
    return null;
  }

  return normalized;
}

function parseAllowedHosts(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  const entries = value.split(/[\s,;]+/);
  const unique = new Set<string>();
  for (const entry of entries) {
    const normalized = normalizeHostPattern(entry);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return Array.from(unique);
}

function stripIpv6Brackets(value: string): string {
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1);
  }
  return value;
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local');
}

function isPrivateIpv4(ip: string): boolean {
  const octets = ip.split('.').map((entry) => Number.parseInt(entry, 10));
  if (octets.length !== 4 || octets.some((entry) => !Number.isFinite(entry))) {
    return true;
  }

  const [a, b] = octets;

  if (a === 10 || a === 127 || a === 0) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }
  if (a === 198 && (b === 18 || b === 19)) {
    return true;
  }
  if (a >= 224) {
    return true;
  }

  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (normalized === '::' || normalized === '::1') {
    return true;
  }

  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  const prefix = normalized.slice(0, 3);
  if (prefix === 'fe8' || prefix === 'fe9' || prefix === 'fea' || prefix === 'feb') {
    return true;
  }

  if (normalized.startsWith('::ffff:')) {
    const mappedIp = normalized.slice('::ffff:'.length);
    if (isIP(mappedIp) === 4) {
      return isPrivateIpv4(mappedIp);
    }
  }

  return false;
}

function isPrivateNetworkHost(hostname: string): boolean {
  const ip = stripIpv6Brackets(hostname);
  const ipVersion = isIP(ip);
  if (ipVersion === 4) {
    return isPrivateIpv4(ip);
  }
  if (ipVersion === 6) {
    return isPrivateIpv6(ip);
  }
  return false;
}

function hostMatchesAllowEntry(hostname: string, entry: string): boolean {
  if (entry === '*') {
    return true;
  }

  const wildcard = entry.startsWith('*.');
  const base = wildcard ? entry.slice(2) : entry;
  if (!base) {
    return false;
  }

  if (hostname === base) {
    return true;
  }

  return hostname.endsWith(`.${base}`);
}

function isAllowedHostname(hostname: string, allowedHosts: readonly string[]): boolean {
  if (allowedHosts.length === 0) {
    return true;
  }

  return allowedHosts.some((entry) => hostMatchesAllowEntry(hostname, entry));
}

function invalidResult(code: WebhookValidationCode, message: string): WebhookValidationResult {
  return {
    valid: false,
    code,
    message,
    normalizedUrl: null,
    hostname: null,
  };
}

export function readWebhookSecurityConfig(
  env: NodeJS.ProcessEnv = process.env,
): WebhookSecurityConfig {
  const allowedHosts = parseAllowedHosts(
    env.WEBHOOK_ALLOWED_HOSTS ?? env.NOTIFICATION_WEBHOOK_ALLOWED_HOSTS,
  );

  return {
    httpsOnly: parseBoolean(env.WEBHOOK_REQUIRE_HTTPS, true),
    allowPrivateNetworks: parseBoolean(env.WEBHOOK_ALLOW_PRIVATE_NETWORKS, false),
    allowLocalhost: parseBoolean(env.WEBHOOK_ALLOW_LOCALHOST, false),
    allowedHosts,
  };
}

export function validateWebhookUrl(
  value: string | null | undefined,
  config: WebhookSecurityConfig = readWebhookSecurityConfig(),
): WebhookValidationResult {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return invalidResult('empty_url', 'must be provided.');
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return invalidResult('invalid_url', 'must be a valid URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return invalidResult('invalid_protocol', 'must use HTTP or HTTPS.');
  }
  if (config.httpsOnly && parsed.protocol !== 'https:') {
    return invalidResult('https_required', 'must use HTTPS.');
  }

  if (parsed.username || parsed.password) {
    return invalidResult('credentials_not_allowed', 'must not include embedded credentials.');
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname) {
    return invalidResult('invalid_url', 'must include a hostname.');
  }

  if (!config.allowLocalhost && isLocalHostname(hostname)) {
    return invalidResult('localhost_not_allowed', 'localhost domains are not allowed.');
  }

  if (!config.allowPrivateNetworks && isPrivateNetworkHost(hostname)) {
    return invalidResult(
      'private_network_not_allowed',
      'private or loopback network targets are not allowed.',
    );
  }

  if (!isAllowedHostname(hostname, config.allowedHosts)) {
    return invalidResult('host_not_allowed', 'hostname is not in the configured allowlist.');
  }

  return {
    valid: true,
    code: 'ok',
    message: 'ok',
    normalizedUrl: parsed.toString(),
    hostname,
  };
}
