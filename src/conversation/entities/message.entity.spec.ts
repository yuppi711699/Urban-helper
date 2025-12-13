import { Message, MessageRole } from './message.entity';

describe('Message Entity', () => {
  describe('MessageRole enum', () => {
    it('should have all required roles', () => {
      expect(MessageRole.USER).toBe('user');
      expect(MessageRole.ASSISTANT).toBe('assistant');
      expect(MessageRole.SYSTEM).toBe('system');
    });

    it('should have exactly 3 roles', () => {
      const roles = Object.keys(MessageRole);
      expect(roles.length).toBe(3);
    });
  });

  describe('Message class', () => {
    it('should create a message instance', () => {
      const message = new Message();
      expect(message).toBeInstanceOf(Message);
    });

    it('should allow setting all properties', () => {
      const message = new Message();
      message.id = 'msg-uuid';
      message.userId = 'user-uuid';
      message.role = MessageRole.USER;
      message.content = 'Hello, bot!';
      message.whatsappMessageId = 'SM123456';
      message.createdAt = new Date();

      expect(message.id).toBe('msg-uuid');
      expect(message.userId).toBe('user-uuid');
      expect(message.role).toBe(MessageRole.USER);
      expect(message.content).toBe('Hello, bot!');
      expect(message.whatsappMessageId).toBe('SM123456');
    });

    it('should handle assistant messages', () => {
      const message = new Message();
      message.role = MessageRole.ASSISTANT;
      message.content = 'Welcome to Natal Bot!';

      expect(message.role).toBe('assistant');
    });

    it('should handle system messages', () => {
      const message = new Message();
      message.role = MessageRole.SYSTEM;
      message.content = 'System prompt here';

      expect(message.role).toBe('system');
    });

    it('should handle long content', () => {
      const message = new Message();
      const longContent = 'A'.repeat(10000);
      message.content = longContent;

      expect(message.content.length).toBe(10000);
    });

    it('should handle unicode content', () => {
      const message = new Message();
      message.content = '✨ Hello! 🌟 你好 مرحبا';

      expect(message.content).toContain('✨');
      expect(message.content).toContain('你好');
    });
  });
});



