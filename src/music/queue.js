let queue = [];
let currentSong = null;

function setQueue(arr) {
  queue = arr;
}

function getQueue() {
  return queue;
}

function insertNext(songFile) {
  queue.unshift(songFile);
}

function rotateToNext() {
  if (!queue.length) {
    currentSong = null;
    return null;
  }

  currentSong = queue.shift();
  queue.push(currentSong);
  return currentSong;
}

function getCurrentSong() {
  return currentSong;
}

function clearQueue() {
  queue = [];
  currentSong = null;
}

module.exports = {
  setQueue,
  getQueue,
  insertNext,
  rotateToNext,
  getCurrentSong,
  clearQueue
};
