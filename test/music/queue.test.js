const {
  setQueue,
  getQueue,
  insertNext,
  rotateToNext,
  getCurrentSong,
  clearQueue
} = require('../../src/music/queue');

describe('queue', () => {
  beforeEach(() => {
    clearQueue();
  });

  test('setQueue and getQueue work correctly', () => {
    const songs = ['song1.mp3', 'song2.mp3', 'song3.mp3'];
    setQueue(songs);
    expect(getQueue()).toEqual(songs);
  });

  test('insertNext adds song to front of queue', () => {
    setQueue(['song1.mp3', 'song2.mp3']);
    insertNext('priority.mp3');
    expect(getQueue()).toEqual(['priority.mp3', 'song1.mp3', 'song2.mp3']);
  });

  test('rotateToNext returns next song and moves it to end', () => {
    setQueue(['song1.mp3', 'song2.mp3', 'song3.mp3']);
    
    const first = rotateToNext();
    expect(first).toBe('song1.mp3');
    expect(getQueue()).toEqual(['song2.mp3', 'song3.mp3', 'song1.mp3']);
    expect(getCurrentSong()).toBe('song1.mp3');
    
    const second = rotateToNext();
    expect(second).toBe('song2.mp3');
    expect(getQueue()).toEqual(['song3.mp3', 'song1.mp3', 'song2.mp3']);
    expect(getCurrentSong()).toBe('song2.mp3');
  });

  test('rotateToNext returns null when queue is empty', () => {
    const result = rotateToNext();
    expect(result).toBeNull();
    expect(getCurrentSong()).toBeNull();
  });

  test('getCurrentSong returns null initially', () => {
    expect(getCurrentSong()).toBeNull();
  });

  test('clearQueue resets queue and current song', () => {
    setQueue(['song1.mp3', 'song2.mp3']);
    rotateToNext();
    
    clearQueue();
    
    expect(getQueue()).toEqual([]);
    expect(getCurrentSong()).toBeNull();
  });
});
