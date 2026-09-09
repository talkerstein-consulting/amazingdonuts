import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Render the real account workspace with child controls isolated from API calls.
const source = ts.createSourceFile("main.jsx", readFileSync(new URL("../apps/portal/main.jsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
const admin = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "Admin");
const compiled = ts.transpileModule(admin.getText(source), { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
const Admin = runInNewContext(`${compiled}; Admin`, {
  React,
  useState: React.useState,
  useEffect: React.useEffect,
  AccountList: ({ canCreate }) => React.createElement("div", { "data-can-create": canCreate }),
  AccountDetail: ({ staff }) => React.createElement("div", { "data-can-manage": staff }),
});
const account = { id: "test-account", organization_name: "Test Organization", status: "active" };
const props = { view: "accounts", accounts: [account], customOrders: [], demo: true };

test("Accounts renders for owners and staff without a runtime reference error", () => {
  for (const role of ["owner", "staff"]) {
    const html = renderToStaticMarkup(React.createElement(Admin, { ...props, user: { role } }));
    assert.match(html, /data-can-create="true"/);
    assert.match(html, /data-can-manage="true"/);
  }
});

test("Accounts renders the initial empty state before account data arrives", () => {
  const html = renderToStaticMarkup(React.createElement(Admin, { ...props, user: { role: "owner" }, accounts: [] }));
  assert.match(html, /No account selected/);
});

test("Accounts does not grant admin controls to customer roles", () => {
  const html = renderToStaticMarkup(React.createElement(Admin, { ...props, user: { role: "customer" } }));
  assert.match(html, /data-can-create="false"/);
  assert.match(html, /data-can-manage="false"/);
});
