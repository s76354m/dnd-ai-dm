/**
 * Mock Test File
 * 
 * Simple tests to check that our jest configuration is working properly.
 */

describe('Mock Tests', () => {
  test('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });
  
  test('should correctly use mockInterfaces', () => {
    const mockChar = global.mockInterfaces.createMockCharacter({
      name: 'Test Character'
    });
    
    expect(mockChar.name).toBe('Test Character');
    expect(mockChar.id).toContain('player-');
  });
}); 