describe('index.js', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DISCORD_BOT_TOKEN = 'bot-token-xyz';
  });

  test('constructs client and calls login with token', () => {
    const loginMock = jest.fn().mockResolvedValue(undefined);
    const onMock = jest.fn();
    const onceMock = jest.fn();

    const Collection = function() { return new Map(); };

    jest.doMock('discord.js', () => {
      function SlashCommandBuilder() {
        this._name = '';
        this.setName = (n) => { this._name = n; return this; };
        this.setDescription = () => this;
        this.toJSON = () => ({ name: this._name });
      }
      return {
        Client: function() { return { commands: null, on: onMock, once: onceMock, login: loginMock }; },
        Collection,
        GatewayIntentBits: { Guilds: 1 },
        SlashCommandBuilder,
        Events: { InteractionCreate: 'InteractionCreate', ClientReady: 'ClientReady' },
        MessageFlags: { Ephemeral: 64 },
      };
    });

    jest.doMock('dotenv', () => ({ config: jest.fn() }));

    require('../src/index');

    expect(loginMock).toHaveBeenCalledWith('bot-token-xyz');
  });
});
