export type WooCommerceProduct = {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_status: "instock" | "outofstock" | "onbackorder";
  stock_quantity: number | null;
};

export type ProductSearchResult = {
  id: number;
  name: string;
  slug: string;
  url: string;
  sku: string | null;
  price: string;
  regularPrice: string;
  salePrice: string | null;
  onSale: boolean;
  stockStatus: WooCommerceProduct["stock_status"];
  stockQuantity: number | null;
};

export class WooCommerceApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "WooCommerceApiError";
  }
}

function getWooCommerceConfig() {
  const storeUrl = process.env.WOOCOMMERCE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!storeUrl) {
    throw new Error("WOOCOMMERCE_URL is missing.");
  }

  if (!consumerKey) {
    throw new Error("WOOCOMMERCE_CONSUMER_KEY is missing.");
  }

  if (!consumerSecret) {
    throw new Error("WOOCOMMERCE_CONSUMER_SECRET is missing.");
  }

  return {
    storeUrl: storeUrl.replace(/\/+$/, ""),
    consumerKey,
    consumerSecret,
  };
}

async function wooCommerceRequest<T>(
  endpoint: string,
  parameters: Record<string, string> = {},
): Promise<T> {
  const { storeUrl, consumerKey, consumerSecret } =
    getWooCommerceConfig();

  const url = new URL(
    `${storeUrl}/wp-json/wc/v3/${endpoint}`,
  );

  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, value);
  }

  const authorization = Buffer.from(
    `${consumerKey}:${consumerSecret}`,
  ).toString("base64");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${authorization}`,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const responseBody = await response.text();

    throw new WooCommerceApiError(
      `WooCommerce request failed: ${response.status} ${responseBody.slice(0, 500)}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

function mapProduct(
  product: WooCommerceProduct,
): ProductSearchResult {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    url: product.permalink,
    sku: product.sku || null,
    price: product.price,
    regularPrice: product.regular_price,
    salePrice: product.sale_price || null,
    onSale: product.on_sale,
    stockStatus: product.stock_status,
    stockQuantity: product.stock_quantity,
  };
}

export async function searchProducts(
  searchTerm: string,
  limit = 5,
): Promise<ProductSearchResult[]> {
  const normalizedSearchTerm = searchTerm.trim();

  if (!normalizedSearchTerm) {
    throw new Error("Product search term cannot be empty.");
  }

  const safeLimit = Math.min(Math.max(limit, 1), 10);

  const products =
    await wooCommerceRequest<WooCommerceProduct[]>("products", {
      search: normalizedSearchTerm,
      status: "publish",
      per_page: String(safeLimit),
    });

  return products.map(mapProduct);
}