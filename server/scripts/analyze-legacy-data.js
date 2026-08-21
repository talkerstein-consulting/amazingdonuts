import { createReadStream } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";

const dataDirectory = process.argv[2];
if (!dataDirectory) {
  console.error("Usage: npm run data:analyze -- /absolute/path/to/Website Data");
  process.exit(1);
}

async function readRows(file) {
  const rows = [];
  const parser = createReadStream(path.join(dataDirectory, file)).pipe(
    parse({ columns: true, bom: true, relax_quotes: true, skip_empty_lines: true })
  );
  for await (const row of parser) rows.push(row);
  return rows;
}

const products = await readRows("products-2026-07-08.csv");
const customers = await readRows("customers-2026-07-08-17-38-38.csv");
const visibleProducts = products.filter((row) => row["Product Visible"] === "Y");
const inventoriedProducts = products.filter((row) => row["Product Inventoried"] === "Y");
const categories = new Set(
  products.flatMap((row) => (row["Category Details"] || "").split(",").map((value) => value.trim())).filter(Boolean)
);
const customerEmails = customers.map((row) => row.Email?.trim().toLowerCase()).filter(Boolean);
const duplicateEmails = customerEmails.length - new Set(customerEmails).size;

console.log(
  JSON.stringify(
    {
      products: {
        total: products.length,
        visible: visibleProducts.length,
        inventoried: inventoriedProducts.length,
        categories: categories.size,
        missingSku: products.filter((row) => !row.Code?.trim()).length,
        missingPrice: products.filter((row) => !row["Retail Price"]?.trim()).length
      },
      customers: {
        total: customers.length,
        withEmail: customerEmails.length,
        withPhone: customers.filter((row) => row.Phone?.trim()).length,
        duplicateEmailRows: duplicateEmails,
        withCompany: customers.filter((row) => row.Company?.trim()).length
      }
    },
    null,
    2
  )
);
