export type VisionHubChain = 'zera';
export type TokenEncodingMode = 'canonical' | 'raw';

export interface ProtocolSendLinkParams {
  chain: VisionHubChain;
  recipient: string;
  amount?: string;
  token?: string;
  memo?: string;
  tokenEncoding?: TokenEncodingMode;
}

export interface VisionHubSendLinkParams {
  chain: VisionHubChain;
  recipient: string;
  amount?: string;
  token?: string;
  memo?: string;
}

export type VisionHubLauncherParams =
  | {
      type: 'send';
      chain: VisionHubChain;
      recipient: string;
      amount?: string;
      token?: string;
      memo?: string;
    }
  | {
      type: 'action';
      chain: VisionHubChain;
      actionUrl: string;
    }
  | {
      type: 'browse';
      url: string;
    };

export type ProtocolLauncherParams =
  | {
      type: 'send';
      chain: VisionHubChain;
      recipient: string;
      amount?: string;
      token?: string;
      memo?: string;
    }
  | {
      type: 'action';
      chain: VisionHubChain;
      actionUrl: string;
    };

function isPresent(value?: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function encode(value: string): string {
  return encodeURIComponent(value);
}

function toQueryString(entries: Array<[string, string]>): string {
  return entries.length > 0
    ? `?${entries.map(([key, value]) => `${key}=${value}`).join('&')}`
    : '';
}

export function isSupportedVisionHubChain(value: string | null | undefined): value is VisionHubChain {
  return value === 'zera';
}

export function isHttpUrl(value: string | null | undefined): value is string {
  if (!isPresent(value)) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildProtocolSendLink({
  chain,
  recipient,
  amount,
  token,
  memo,
  tokenEncoding = 'canonical',
}: ProtocolSendLinkParams): string {
  const trimmedRecipient = recipient.trim();
  const queryEntries: Array<[string, string]> = [];

  if (isPresent(amount)) {
    queryEntries.push(['amount', encode(amount.trim())]);
  }

  if (isPresent(token)) {
    const preparedToken = token.trim();
    queryEntries.push([
      'token',
      tokenEncoding === 'raw' ? preparedToken : encode(preparedToken),
    ]);
  }

  if (isPresent(memo)) {
    queryEntries.push(['memo', encode(memo.trim())]);
  }

  return `${chain}:${trimmedRecipient}${toQueryString(queryEntries)}`;
}

export function buildProtocolActionLink(chain: VisionHubChain, actionUrl: string): string {
  return `${chain}-action:${encode(actionUrl.trim())}`;
}

export function buildVisionHubSendLink({
  chain,
  recipient,
  amount,
  token,
  memo,
}: VisionHubSendLinkParams): string {
  const queryEntries: Array<[string, string]> = [
    ['to', encode(recipient.trim())],
    ['chain', encode(chain)],
  ];

  if (isPresent(amount)) {
    queryEntries.push(['amount', encode(amount.trim())]);
  }

  if (isPresent(token)) {
    queryEntries.push(['token', encode(token.trim())]);
  }

  if (isPresent(memo)) {
    queryEntries.push(['memo', encode(memo.trim())]);
  }

  return `visionhub://send${toQueryString(queryEntries)}`;
}

export function buildVisionHubBrowseLink(url: string): string {
  return `visionhub://browse?url=${encode(url.trim())}`;
}

export function buildVisionHubActionLink(chain: VisionHubChain, actionUrl: string): string {
  return `visionhub://action${toQueryString([
    ['url', encode(actionUrl.trim())],
    ['chain', encode(chain)],
  ])}`;
}

export function buildVisionHubLauncherPath(params: VisionHubLauncherParams): string {
  const queryEntries: Array<[string, string]> = [];

  if (params.type === 'browse') {
    queryEntries.push(['url', encode(params.url.trim())]);
  }

  if (params.type === 'send') {
    queryEntries.push(['to', encode(params.recipient.trim())]);
    queryEntries.push(['chain', encode(params.chain)]);

    if (isPresent(params.amount)) {
      queryEntries.push(['amount', encode(params.amount.trim())]);
    }

    if (isPresent(params.token)) {
      queryEntries.push(['token', encode(params.token.trim())]);
    }

    if (isPresent(params.memo)) {
      queryEntries.push(['memo', encode(params.memo.trim())]);
    }
  }

  if (params.type === 'action') {
    queryEntries.push(['action', encode(params.actionUrl.trim())]);
    queryEntries.push(['chain', encode(params.chain)]);
  }

  return `/open/visionhub${toQueryString(queryEntries)}`;
}

export function buildProtocolLauncherPath(params: ProtocolLauncherParams): string {
  const queryEntries: Array<[string, string]> = [
    ['type', encode(params.type)],
    ['chain', encode(params.chain)],
  ];

  if (params.type === 'send') {
    queryEntries.push(['to', encode(params.recipient.trim())]);

    if (isPresent(params.amount)) {
      queryEntries.push(['amount', encode(params.amount.trim())]);
    }

    if (isPresent(params.token)) {
      queryEntries.push(['token', encode(params.token.trim())]);
    }

    if (isPresent(params.memo)) {
      queryEntries.push(['memo', encode(params.memo.trim())]);
    }
  }

  if (params.type === 'action') {
    queryEntries.push(['action', encode(params.actionUrl.trim())]);
  }

  return `/open/wallet${toQueryString(queryEntries)}`;
}
