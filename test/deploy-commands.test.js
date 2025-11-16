describe('deploy-commands.js', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DISCORD_TOKEN = 'test-token';
    process.env.CLIENT_ID = 'client-123';
    process.env.GUILD_ID = 'guild-456';
  });

  test('calls REST.put to register commands', async () => {
    const putMock = jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const setTokenMock = jest.fn().mockReturnValue({ put: putMock });

    jest.doMock('discord.js', () => {
      function SlashCommandBuilder() {
        this._name = '';
        this.setName = (n) => { this._name = n; return this; };
        this.setDescription = () => this;
        this.toJSON = () => ({ name: this._name });
      }
      return {
        REST: function() { return { setToken: setTokenMock }; },
        Routes: { applicationGuildCommands: jest.fn(() => 'route') },
        SlashCommandBuilder,
      };
    });

    jest.doMock('dotenv', () => ({ config: jest.fn() }));

    require('../src/deploy-commands');

    await new Promise((r) => setImmediate(r));

    expect(setTokenMock).toHaveBeenCalledWith('test-token');
    expect(putMock).toHaveBeenCalled();
  });
});
