// server/utils/hashPassword.js
// Run with: npm run make-admin-hash
// Prompts for a password, prints a bcrypt hash to paste into .env as ADMIN_PASSWORD_HASH.

const bcrypt = require("bcryptjs");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("New admin password: ", (password) => {
  const hash = bcrypt.hashSync(password, 10);
  console.log("\nAdd this to your .env file:\n");
  console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
  rl.close();
});
