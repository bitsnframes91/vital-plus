// Placeholder for the future Fairvital Shopware Store API integration.
// Shopware stays responsible for products, prices, stock, cart, checkout, payments and orders.
// The app only links to product pages on fairvital.com.
import { products, type Product } from "./data";

export async function getProductForMarker(markerId: string): Promise<Product | undefined> {
  // TODO: replace with Shopware Store API call (GET /store-api/product)
  return products.find((p) => p.relatedMarker === markerId);
}

export function productUrl(p: Product) {
  return p.url;
}
