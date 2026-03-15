/**
 * Browse local or global docs roots, topics, section indexes, and global vector search results.
 * @autohelp
 * @usage ndex [topic] [section] [--expand] [--global] | ndex query [--limit <n>] <query...> | ndex query status
 * @flag --expand Show nested skill references and file-level contents
 * @flag --global Only include docs from ~/.ngents/docs for browsing
 * @flag --limit <n> Limit query results (default: 5)
 * @global ndex
 */
import { runNdex } from "./_ndex";
import { runNdexQuery } from "./_ndex_query";

const args = process.argv.slice(2);

if (args[0] === 'query') {
	await runNdexQuery(args.slice(1));
	process.exit(0);
}

await runNdex();
