import { User, ConversationState } from './user.entity';

describe('User Entity', () => {
  describe('ConversationState enum', () => {
    it('should have all required states', () => {
      expect(ConversationState.NEW).toBe('NEW');
      expect(ConversationState.AWAITING_NAME).toBe('AWAITING_NAME');
      expect(ConversationState.AWAITING_BIRTH_DATE).toBe('AWAITING_BIRTH_DATE');
      expect(ConversationState.AWAITING_BIRTH_TIME).toBe('AWAITING_BIRTH_TIME');
      expect(ConversationState.AWAITING_BIRTH_PLACE).toBe('AWAITING_BIRTH_PLACE');
      expect(ConversationState.CHART_READY).toBe('CHART_READY');
      expect(ConversationState.CHATTING).toBe('CHATTING');
    });

    it('should have exactly 7 states', () => {
      const states = Object.keys(ConversationState);
      expect(states.length).toBe(7);
    });
  });

  describe('User class', () => {
    it('should create a user instance', () => {
      const user = new User();
      expect(user).toBeInstanceOf(User);
    });

    it('should allow setting all properties', () => {
      const user = new User();
      user.id = 'test-uuid';
      user.phoneNumber = 'whatsapp:+1234567890';
      user.name = 'John Doe';
      user.birthDate = new Date('1990-01-01');
      user.birthTime = '12:00';
      user.birthPlace = 'London, UK';
      user.birthLatitude = 51.5074;
      user.birthLongitude = -0.1278;
      user.timezone = 'Europe/London';
      user.conversationState = ConversationState.CHATTING;

      expect(user.id).toBe('test-uuid');
      expect(user.phoneNumber).toBe('whatsapp:+1234567890');
      expect(user.name).toBe('John Doe');
      expect(user.birthLatitude).toBe(51.5074);
      expect(user.conversationState).toBe(ConversationState.CHATTING);
    });
  });
});



