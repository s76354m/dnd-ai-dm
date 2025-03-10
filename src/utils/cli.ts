import inquirer from 'inquirer';
import { races } from '../character/data/races';

export async function promptRaceSelection(): Promise<string> {
  const { race } = await inquirer.prompt({
    type: 'list',
    name: 'race',
    message: 'Choose your race:',
    choices: Object.keys(races)
  });
  return race;
} 