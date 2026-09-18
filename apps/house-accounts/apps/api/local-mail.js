import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export const defaultLocalMailOutbox = path.join(homedir(), ".codex", "amazing-donuts-mail");

export function localMailTransport(directory = defaultLocalMailOutbox) {
  return {
    async sendMail(message) {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const file = path.join(directory, `${Date.now()}-${randomBytes(6).toString("hex")}.txt`);
      const recipient = Array.isArray(message.to) ? message.to.join(", ") : String(message.to);
      const content = `To: ${recipient}\nFrom: ${message.from}\nSubject: ${message.subject}\n\n${message.text || ""}\n`;
      await writeFile(file, content, { mode: 0o600, flag: "wx" });
      return { messageId: path.basename(file) };
    },
  };
}
