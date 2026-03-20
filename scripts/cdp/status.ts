/**
 * Show status for the local Chrome CDP session from ~/.ngents/local/cdp.json.
 * @autohelp
 * @usage cdp status
 */
import { runStatusCommand } from './lib/cdp';

await runStatusCommand();
