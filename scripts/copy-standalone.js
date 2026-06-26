const fs = require("fs");
const path = require("path");

const root = process.cwd();
const srcStatic = path.join(root, ".next", "static");
const destStatic = path.join(root, ".next", "standalone", ".next", "static");
const srcPublic = path.join(root, "public");
const destPublic = path.join(root, ".next", "standalone", "public");
const srcDb = path.join(root, "db");
const destDb = path.join(root, ".next", "standalone", "db");
const envSrc = path.join(root, ".env");
const envDest = path.join(root, ".next", "standalone", ".env");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

copyDir(srcStatic, destStatic);
copyDir(srcPublic, destPublic);
copyDir(srcDb, destDb);

if (fs.existsSync(envSrc)) {
  fs.copyFileSync(envSrc, envDest);
}

console.log("Copied standalone static assets, public files, and database.");
