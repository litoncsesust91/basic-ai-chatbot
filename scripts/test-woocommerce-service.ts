import { searchProducts } from "../app/services/woocommerce.server";

const searchTerm =
  process.argv.slice(2).join(" ").trim() || "shirt";

console.log(`Searching WooCommerce for: ${searchTerm}`);

const products = await searchProducts(searchTerm, 5);

if (products.length === 0) {
  console.log("No matching products found.");
} else {
  console.table(products);
}