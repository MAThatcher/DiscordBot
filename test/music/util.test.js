const { musicDir, listMusicFiles, shuffle } = require('../../src/music/util');
const path = require('path');

describe('util', () => {
  test('musicDir points to assets/audio', () => {
    expect(musicDir).toContain(path.join('src', 'assets', 'audio'));
  });

  test('listMusicFiles returns array of files', () => {
    const fs = require('node:fs');
    jest.spyOn(fs, 'readdirSync').mockReturnValue(['song1.mp3', 'song2.mp3', 'subdir']);
    jest.spyOn(fs, 'statSync').mockImplementation((p) => ({
      isFile: () => !p.endsWith('subdir')
    }));

    const files = listMusicFiles();
    
    expect(files).toEqual(['song1.mp3', 'song2.mp3']);
    
    fs.readdirSync.mockRestore();
    fs.statSync.mockRestore();
  });

  test('listMusicFiles returns empty array on error', () => {
    const fs = require('node:fs');
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
      throw new Error('Directory not found');
    });

    const files = listMusicFiles();
    
    expect(files).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error reading music directory:',
      expect.any(Error)
    );
    
    fs.readdirSync.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('shuffle randomizes array without mutation', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffle(original);
    
    expect(shuffled).toHaveLength(5);
    expect(shuffled).toEqual(expect.arrayContaining(original));
    expect(original).toEqual([1, 2, 3, 4, 5]); // original not mutated
  });

  test('shuffle produces different results', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = new Set();
    
    for (let i = 0; i < 10; i++) {
      results.add(JSON.stringify(shuffle(arr)));
    }
    
    // With 10 elements shuffled 10 times, we should get at least 2 different results
    expect(results.size).toBeGreaterThan(1);
  });
});
