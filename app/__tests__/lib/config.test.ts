import config from '../../lib/config';

describe('Config', () => {
  it('should have a matrix homeserver URL', () => {
    expect(config.matrixHomeserver).toBeDefined();
    expect(typeof config.matrixHomeserver).toBe('string');
  });

  it('should have a bot user ID', () => {
    expect(config.botUserId).toBeDefined();
    expect(config.botUserId).toMatch(/^@.+:.+$/);
  });

  it('should have an app name', () => {
    expect(config.appName).toBe('ClawChat');
  });

  it('should have an app version', () => {
    expect(config.appVersion).toBeDefined();
  });
});
