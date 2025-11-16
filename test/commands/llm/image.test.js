const fs = require('node:fs');

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.resetModules();
});

test('image.execute replies with an attachment when images exist', async () => {
  const path = require('path');
  const realFs = jest.requireActual('node:fs');
  jest.doMock('node:fs', () => ({
    ...realFs,
    readdirSync: (p, ...rest) => (p.includes(path.join('src', 'assets', 'images')) ? ['img.jpg'] : realFs.readdirSync(p, ...rest)),
    statSync: (p, ...rest) => (p.endsWith('img.jpg') ? { isFile: () => true } : realFs.statSync(p, ...rest)),
    existsSync: (p) => (p.endsWith('img.jpg') ? true : realFs.existsSync(p)),
  }));

  const image = require('../../../src/commands/llm/image');

  const options = { getString: () => null };
  const interaction = { options, reply: jest.fn().mockResolvedValue(undefined) };

  await image.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('Here you go'), files: expect.any(Array) }));
});
