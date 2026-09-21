import {
  searchProducts,
  WooCommerceApiError,
} from "../services/woocommerce.server";

type FunctionToolDefinition = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict: boolean;
};

type SearchProductsArguments = {
  query: string;
};

export const SEARCH_PRODUCTS_TOOL_NAME =
  "search_woocommerce_products";

export const searchProductsTool: FunctionToolDefinition = {
  type: "function",
  name: SEARCH_PRODUCTS_TOOL_NAME,
  description:
    "Search the live WooCommerce product catalog. Use this for current product availability, prices, sale prices, SKUs, stock status, and product links.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "The product name, product type, SKU, or search phrase supplied by the customer.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  strict: true,
};

function parseArguments(
  argumentsJson: string,
): SearchProductsArguments {
  let parsed: unknown;

  try {
    parsed = JSON.parse(argumentsJson);
  } catch {
    throw new Error("Tool arguments are not valid JSON.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("query" in parsed) ||
    typeof parsed.query !== "string" ||
    parsed.query.trim().length === 0
  ) {
    throw new Error(
      "search_woocommerce_products requires a non-empty query.",
    );
  }

  return {
    query: parsed.query.trim(),
  };
}

export async function executeSearchProductsTool(
  argumentsJson: string,
): Promise<string> {
  try {
    const { query } = parseArguments(argumentsJson);
    const products = await searchProducts(query, 5);

    return JSON.stringify({
      ok: true,
      query,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("[search_woocommerce_products]", error);

    if (error instanceof WooCommerceApiError) {
      return JSON.stringify({
        ok: false,
        error: {
          code: "WOOCOMMERCE_UNAVAILABLE",
          message:
            "The live product catalog is temporarily unavailable.",
        },
      });
    }

    return JSON.stringify({
      ok: false,
      error: {
        code: "INVALID_TOOL_ARGUMENTS",
        message:
          error instanceof Error
            ? error.message
            : "Invalid product-search arguments.",
      },
    });
  }
}