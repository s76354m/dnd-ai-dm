import { CreationState } from './creator';
import { CharacterValidator } from './validator';
import { ValidationError } from './validator';

export class CreationMiddleware {
  static async validateStep(state: CreationState): Promise<boolean> {
    const result = CharacterValidator.validateCharacter(state.character);
    
    if (!result.isValid) {
      state.validationErrors = result.errors.map((e: ValidationError) => e.message);
      return false;
    }
    return true;
  }
} 