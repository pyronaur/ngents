---
summary: "tmux guide for persistent debugging and log capture"
read_when:
  - Need persistent terminal state for debugger/logging.
  - Need reproducible log capture during UI/manual repro.
  - tmux default socket/server is unstable ("server exited unexpectedly").
---

# tmux guide

Goal: predictable tmux workflows for debug sessions and log-based bug hunts.

## 1) Standard persistent session

```bash
tmux new-session -d -s codex-shell
tmux attach -t codex-shell
tmux list-sessions
```

## 2) Isolated socket (recommended)

Use when default tmux server/socket is flaky or shared state is noisy.

```bash
SOCKET=debugsock
SESSION=debug-session

tmux -f /dev/null -L "$SOCKET" new-session -d -s "$SESSION"
tmux -f /dev/null -L "$SOCKET" rename-window -t "$SESSION":0 app-logs
tmux -f /dev/null -L "$SOCKET" new-window -t "$SESSION" -n security
tmux -f /dev/null -L "$SOCKET" list-windows -t "$SESSION"
```

Notes:
- `-f /dev/null`: no user tmux config side effects.
- `-L <name>`: dedicated socket namespace; isolates from broken default server.

## 3) Start log streams

Replace predicates with your app/process names.

```bash
SOCKET=debugsock
SESSION=debug-session

tmux -f /dev/null -L "$SOCKET" send-keys -t "$SESSION":app-logs \
  "clear && log stream --style compact --level debug --predicate 'process == \"<AppProcess>\"'" Enter

tmux -f /dev/null -L "$SOCKET" send-keys -t "$SESSION":security \
  "clear && log stream --style compact --level debug --predicate '(process == \"sandboxd\" AND eventMessage CONTAINS[c] \"<AppName>\") OR (process == \"tccd\" AND eventMessage CONTAINS[c] \"<BundleID>\")'" Enter
```

## 4) Clear/reset before each repro

```bash
SOCKET=debugsock
SESSION=debug-session

tmux -f /dev/null -L "$SOCKET" send-keys -t "$SESSION":app-logs C-c
tmux -f /dev/null -L "$SOCKET" send-keys -t "$SESSION":security C-c
tmux -f /dev/null -L "$SOCKET" clear-history -t "$SESSION":app-logs
tmux -f /dev/null -L "$SOCKET" clear-history -t "$SESSION":security
```

Then re-run step 3.

## 5) Capture evidence after user action

```bash
SOCKET=debugsock
SESSION=debug-session

tmux -f /dev/null -L "$SOCKET" capture-pane -p -J -t "$SESSION":app-logs -S -300
tmux -f /dev/null -L "$SOCKET" capture-pane -p -J -t "$SESSION":security -S -300
```

## 6) Live view / teardown

```bash
SOCKET=debugsock
SESSION=debug-session

tmux -f /dev/null -L "$SOCKET" attach -t "$SESSION"
tmux -f /dev/null -L "$SOCKET" kill-session -t "$SESSION"
```

## 7) Failure mode: "server exited unexpectedly"

Symptoms:
- `tmux start-server` fails.
- `tmux new-session` fails immediately.

Recovery:
1. Do not fight default socket.
2. Start isolated server with `tmux -f /dev/null -L <newname>`.
3. Recreate windows/panes and continue capture.
