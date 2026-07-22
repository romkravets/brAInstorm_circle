import { program } from 'commander';
import { loginSite } from './auth.js';
import { runRound } from './runRound.js';

program
  .command('login <site>')
  .description('Зберегти сесію браузера. site = claude | gemini')
  .action(async (site) => {
    await loginSite(site);
    process.exit(0);
  });

program
  .command('run')
  .description('Запустити поточний раунд: відкрити AI, отримати відповіді, записати в brAInstorm')
  .action(async () => {
    await runRound();
    process.exit(0);
  });

program.parse();
