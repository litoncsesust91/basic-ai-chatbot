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

const baseUrl = storeUrl.replace(/\/+$/, "");

const authorization = Buffer.from(
  `${consumerKey}:${consumerSecret}`,
).toString("base64");

const response = await fetch(
  `${baseUrl}/wp-json/wc/v3/products?status=publish&per_page=3`,
  {
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${authorization}`,
    },
  },
);

if (!response.ok) {
  const errorBody = await response.text();

  throw new Error(
    `WooCommerce request failed: ${response.status} ${response.statusText}\n${errorBody}`,
  );
}

type WooCommerceProduct = {
  id: number;
  name: string;
  sku: string;
  price: string;
  stock_status: string;
};

const products =
  (await response.json()) as WooCommerceProduct[];

console.table(
  products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku || "No SKU",
    price: product.price,
    stockStatus: product.stock_status,
  })),
);