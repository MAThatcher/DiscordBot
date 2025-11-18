const fs = require("node:fs");
const path = require("node:path");

const musicDir = path.join(__dirname, "..", "assets", "audio");

function listMusicFiles() {
  try {
    return fs.readdirSync(musicDir).filter(f => {
      const full = path.join(musicDir, f);
      return fs.statSync(full).isFile();
    });
  } catch (err) {
    console.error("Error reading music directory:", err);
    return [];
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = {
  musicDir,
  listMusicFiles,
  shuffle
};
