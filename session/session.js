import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_FILE = path.join(__dirname, 'session.json');

export async function saveSession(data) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data));
}

export async function getSession() {
  if (fs.existsSync(SESSION_FILE)) {
    return JSON.parse(fs.readFileSync(SESSION_FILE));
  }
  return null;
}
