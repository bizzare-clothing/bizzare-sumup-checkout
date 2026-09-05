# BIZZARE website — SumUp checkout

```
index.html                       The site (Tailwind CDN, single file)
functions/api/create-checkout.js Creates a real SumUp payment via the API
functions/api/products.js        The REAL prices SumUp charges
```

## How checkout actually works

1. Visitor builds a cart in the browser (this part is unchanged from before).
2. Clicking "Proceed to checkout" sends the cart to `/api/create-checkout`.
3. That function runs on Cloudflare, re-prices everything against `functions/api/products.js` (it ignores any price sent by the browser), then asks SumUp to create a **Hosted Checkout** — a SumUp-hosted payment page for the total.
4. The visitor is redirected there to actually pay by card.
5. SumUp redirects them back to the site with `?order=success` in the URL, which shows the confirmation screen and empties the cart.

You never handle card numbers yourself — SumUp does.

**Note on SumUp specifically:** unlike Stripe or Square, SumUp's Checkout API takes one total `amount` rather than itemised line items — so the customer's SumUp payment page will show a single line (a short text description of what's in the order) rather than a per-product breakdown. The order detail itself still lives correctly in your own function/logs.

## 1. Push this to GitHub

```bash
cd bizzare-sumup
git init
git add .
git commit -m "Initial site with SumUp checkout"
```

Create an empty repo on GitHub (github.com/new — don't initialise it with a README), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/bizzare-website.git
git branch -M main
git push -u origin main
```

## 2. Get your SumUp API credentials

1. Sign up / log in at [sumup.com](https://www.sumup.com).
2. Go to the [SumUp Developer Portal](https://developer.sumup.com) and create an API key for your account (**Settings → API keys**, or via the developer portal's app registration flow).
3. Find your **Merchant Code** — it's shown in your SumUp dashboard (a short code like `MC1A2B3C`), also returned by the `/v0.1/me` API endpoint if you want to confirm it programmatically.
4. Note down your API key and merchant code — you'll paste these into Cloudflare, never into the website's code or GitHub repo.

## 3. Connect the repo to Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick the repo.
3. Build settings: **Framework preset** "None", build command blank, build output directory `/`. Cloudflare auto-detects the `functions/` folder.
4. Before (or after, then redeploy) the first deploy, go to **Settings → Environment variables** and add:
   - `SUMUP_API_KEY` = your API key from step 2.
   - `SUMUP_MERCHANT_CODE` = your merchant code from step 2.

   Add both for **Production** and **Preview** if you want previews to work too.
5. Deploy. Cloudflare gives you a `*.pages.dev` URL immediately.

## 4. Point your own domain at it (optional)

Pages project → **Custom domains → Set up a custom domain**, then follow the prompts.

## 5. Test it

SumUp's sandbox/test tooling differs by account type — check the **Testing** section of the SumUp Developer Portal for the current test card details for your account, since these can change. A Hosted Checkout session expires after 30 minutes if unpaid, which is normal.

## Updating prices or adding a product

Prices/products live in **two places** that need to match:

- The `products` array inside `index.html` — what visitors *see*.
- `functions/api/products.js` — what they're actually *charged*.

If you only update one, the site will show a different price than what SumUp actually charges — always update both together.

## Notes for later

- **Stock control**: nothing here tracks how many tees/hats are left — keep an eye on orders manually for a first drop.
- **Order notifications**: SumUp doesn't automatically email a receipt the way Stripe does — check your SumUp dashboard's notification settings, or look at [SumUp webhooks](https://developer.sumup.com/online-payments/webhooks/) later for something more automated.
- **Price mismatch flag**: this file currently prices the tee at £25 and the hat at £15 — if your actual Drop 001 pricing is £30 / £20, update both files above before going live.
