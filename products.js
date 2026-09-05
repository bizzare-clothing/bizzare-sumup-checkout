// SERVER-SIDE product catalog. This is what the checkout function actually
// charges via SumUp — it never trusts a price sent from the browser.
// Keep this in sync with the `products` array inside index.html whenever
// you add a product or change a price.

export const PRODUCTS = {
  'prod-1': {
    title: 'Oversized Heavyweight Tee',
    price: 25, // GBP
    validSizes: ['S', 'M', 'L', 'XL'],
    validColors: ['White', 'Black'],
  },
  'prod-2': {
    title: 'BIZZARE Trucker Hat',
    price: 15, // GBP
    validSizes: ['ONE SIZE'],
    validColors: null, // no colour choice for this product
  },
};

export const FLAT_SHIPPING = 2.99;
