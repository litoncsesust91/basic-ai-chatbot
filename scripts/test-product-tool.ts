import {
  executeSearchProductsTool,
  searchProductsTool,
} from "../app/tools/search-products.tool.server";

const searchTerm =
  process.argv.slice(2).join(" ").trim() || "hund";

console.log("Tool definition:");

console.dir(searchProductsTool, {
  depth: null,
});

console.log(`\nExecuting tool with query: ${searchTerm}`);

const output = await executeSearchProductsTool(
  JSON.stringify({
    query: searchTerm,
  }),
);

console.log("\nTool output:");

console.dir(JSON.parse(output), {
  depth: null,
});