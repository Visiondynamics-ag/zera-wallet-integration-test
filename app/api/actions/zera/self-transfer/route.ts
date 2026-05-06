import { NextRequest, NextResponse } from 'next/server';
import { buildCoinTXN, serializeTransaction } from '@zera-os/zera.js';

const DEFAULT_AMOUNT = '0.01';
const DEFAULT_TOKEN = '$ZRA+0000';

function buildMetadata(request: NextRequest) {
  const amount = request.nextUrl.searchParams.get('amount') || DEFAULT_AMOUNT;
  const token = request.nextUrl.searchParams.get('token') || DEFAULT_TOKEN;
  const basePath = `${request.nextUrl.origin}${request.nextUrl.pathname}`;

  return {
    chain: 'zera',
    title: 'ZERA Self-Transfer Example Action',
    description:
      'Builds a self-transfer back to the submitting account so Vision Hub can preview and sign a real ZERA action flow.',
    icon: `${request.nextUrl.origin}/icon.svg`,
    label: `Send ${amount} ${token} to yourself`,
    links: {
      actions: [
        {
          label: `Send ${amount} ${token}`,
          href: `${basePath}?amount=${encodeURIComponent(amount)}&token=${encodeURIComponent(token)}`,
        },
        {
          label: 'Send custom amount',
          href: `${basePath}?amount={amount}&token=${encodeURIComponent(token)}`,
          parameters: [
            {
              name: 'amount',
              label: 'Amount',
              required: true,
              placeholder: DEFAULT_AMOUNT,
            },
          ],
        },
      ],
    },
  };
}

export async function GET(request: NextRequest) {
  return NextResponse.json(buildMetadata(request));
}

export async function POST(request: NextRequest) {
  const amount = request.nextUrl.searchParams.get('amount') || DEFAULT_AMOUNT;
  const token = request.nextUrl.searchParams.get('token') || DEFAULT_TOKEN;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const account = typeof body.account === 'string' ? body.account.trim() : '';
  const publicKeyCandidate = typeof body.publicKey === 'string' ? body.publicKey.trim() : '';
  const publicKey = publicKeyCandidate || account;

  if (!account || !publicKey) {
    return NextResponse.json(
      { message: 'This action requires both an account address and a public key.' },
      { status: 400 },
    );
  }

  try {
    const unsigned = await buildCoinTXN(
      [{ publicKey, amount }],
      [{ to: account, amount }],
      token,
      { grpcConfig: {} },
    );

    return NextResponse.json({
      transaction: serializeTransaction(unsigned),
      message: `Sign to send ${amount} ${token} back to your own address.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build the ZERA example action.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
