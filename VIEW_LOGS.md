# How to View Server Logs

## In Cursor/VS Code:

1. **Open Terminal Panel:**
   - Press `` Ctrl+` `` (Windows/Linux) or `` Cmd+` `` (Mac)
   - Or: View → Terminal

2. **Find the Dev Server Terminal:**
   - Look for a terminal tab that says `npm run dev` or `next dev`
   - The logs will appear there in real-time

3. **What to Look For:**
   - When you try to signup, you'll see logs starting with `[SIGNUP]`
   - These show what's happening during the signup process

## Alternative: Check Logs via Command

Run this in a new terminal to see recent Next.js output:
```bash
# This won't show historical logs, but you can watch for new ones
tail -f ~/.npm/_logs/*.log 2>/dev/null || echo "No npm logs found"
```

## What the Logs Will Show:

When you try to signup, you should see:
- `[SIGNUP] Checking for existing user: your@email.com`
- `[SIGNUP] Found user in Auth: ...` (if user exists)
- `[SIGNUP] User exists in both Auth and DB - rejecting signup` (if truly exists)
- `[SIGNUP] Found orphaned auth user, deleting...` (if orphaned)
- `[SIGNUP] User does not exist in Auth or DB - proceeding with creation` (if new)

## Quick Test:

1. Open Terminal in Cursor (`` Cmd+` ``)
2. Try to signup in your browser
3. Watch the terminal for `[SIGNUP]` messages
4. Copy/paste those messages here so I can help debug!

