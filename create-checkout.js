// POST /api/create-checkout
//
// Runs as a Cloudflare Pages Function (edge, no server to manage). It reads
// the cart the browser sends, re-prices everything against the server-side
// catalog in products.js (never trusting a price from the client), then
// asks SumUp to create a Hosted Checkout and returns the URL to redirect
// the customer to.
//
// Requires these environment variables, set in the Cloudflare dashboard:
//   SUMUP_API_KEY       — your SumUp API key
//   SUMUP_MERCHANT_CODE — your SumUp merchant code (e.g. "MC1A2B3C")
//
// No npm dependencies — this calls the SumUp HTTP API directly with fetch.

import { PRODUCTS, FLAT_SHIPPING } from './products.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.SUMUP_API_KEY || !env.SUMUP_MERCHANT_CODE) {
    return jsonResponse({ error: 'Server is not configured with SumUp credentials yet.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return jsonResponse({ error: 'Cart is empty.' }, 400);
  }

  let subtotal = 0;
  const descriptionParts = [];

  for (const item of items) {
    const product = PRODUCTS[item.id];
    if (!product) {
      return jsonResponse({ error: `Unknown product: ${item.id}` }, 400);
    }

    const qty = Number.isInteger(item.quantity) ? item.quantity : parseInt(item.quantity, 10);
    if (!qty || qty < 1 || qty > 20) {
      return jsonResponse({ error: 'Invalid quantity.' }, 400);
    }

    if (!product.validSizes.includes(item.size)) {
      return jsonResponse({ error: `Invalid size for ${item.id}.` }, 400);
    }

    if (product.validColors && !product.validColors.includes(item.color)) {
      return jsonResponse({ error: `Invalid colour for ${item.id}.` }, 400);
    }

    subtotal += product.price * qty;
    descriptionParts.push(`${qty}x ${product.title}${item.color ? ' (' + item.color + ')' : ''} (${item.size})`);
  }

  const total = Math.round((subtotal + FLAT_SHIPPING) * 100) / 100;
  const origin = new URL(request.url).origin;

  const payload = {
    checkout_reference: crypto.randomUUID(),
    amount: total,
    currency: 'GBP',
    merchant_code: env.SUMUP_MERCHANT_CODE,
    description: descriptionParts.join(', ').slice(0, 100),
    redirect_url: `${origin}/?order=success`,
    hosted_checkout: { enabled: true },
  };

  const sumupResponse = await fetch('https://api.sumup.com/v0.1/checkouts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUMUP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const sumupData = await sumupResponse.json();

  if (!sumupResponse.ok) {
    console.error('SumUp error', sumupData);
    const message = sumupData.message || sumupData.error_message || 'SumUp request failed.';
    return jsonResponse({ error: message }, 502);
  }

  return jsonResponse({ url: sumupData.hosted_checkout_url, total });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
