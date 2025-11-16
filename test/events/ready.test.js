const ready = require('../../src/events/ready');

test('ready.execute logs client user tag', () => {
  const client = { user: { tag: 'bot#1234' } };
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  ready.execute(client);

  expect(logSpy).toHaveBeenCalledWith('Ready! Logged in as bot#1234');

  logSpy.mockRestore();
});
