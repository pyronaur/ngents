/**
 * Stop the local Chrome CDP session from ~/.ngents/local/cdp.json.
 * @autohelp
 * @usage cdp stop
 */
import { runStopCommand } from './lib/cdp';

await runStopCommand();
