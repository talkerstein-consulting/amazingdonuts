import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { localMailTransport } from "../apps/api/local-mail.js";

test("sandbox mail stays in a private local outbox", async t => {
  const directory = await mkdtemp(path.join(tmpdir(), "amazing-donuts-mail-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await localMailTransport(directory).sendMail({
    to: "reset-test@example.test",
    from: "Amazing Donuts <accounts@amazingdonuts.com>",
    subject: "Reset your password",
    text: "Open http://127.0.0.1:5175/account/?reset=test-token",
  });
  const [file] = await readdir(directory);
  const content = await readFile(path.join(directory, file), "utf8");
  assert.match(content, /To: reset-test@example\.test/);
  assert.match(content, /127\.0\.0\.1:5175\/account\/\?reset=test-token/);
  assert.equal((await stat(path.join(directory, file))).mode & 0o777, 0o600);
});
