/**
 * Browse local or global docs roots, topics, and section indexes.
 * @autohelp
 * @usage ndex [topic] [section] [--expand] [--repo] [--global]
 * @flag --expand Show nested skill references and file-level contents
 * @flag --repo Only include docs from current repo/local context
 * @flag --global Only include docs from ~/.ngents/docs
 * @global ndex
 */
import { runNdex } from "./_ndex";

await runNdex();
