# SillyTavern Archivist

This repository contains the Archivist plugin skeleton for SillyTavern (user-maintained external plugin/service). It is written in Node.js and is intended to run alongside a local SillyTavern installation (release 1.18.0). The service reads lorebook files from your SillyTavern installation, proposes suggested changes using your local KoboldCPP instances, and provides a web UI to review and apply changes.

Important design constraints (from user):
- The Archivist never writes lorebook updates without explicit user approval.
- Always require manual confirmation to apply accepted suggestions.
- Default lorebook path: SillyTavern/data/default-user/worlds — configurable in config.json.
- Kobold endpoints (default): Lumimaid chat -> http://127.0.0.1:5001, Qwen -> http://127.0.0.1:5002.

Quick start
1. Clone this repo locally.
2. Edit plugin/config.json to point to your SillyTavern lorebook directory and Kobold endpoints.
3. cd plugin && npm install
4. npm start
5. Open http://localhost:3080 in your browser to access the Archivist UI.

Notes
- This is a skeleton: AI prompt templates and parsing are intentionally minimal. Replace/extend ai_engine.js to match your koboldcpp API and desired JSON schema.
- The service reads and writes files in the lorebook directory configured. It makes backups before applying accepted changes.

Where to place it in your workflow
- Run this service on the same machine as SillyTavern.
- It accesses lorebooks on disk directly; SillyTavern will read them as well. If SillyTavern caches lorebooks in memory, restart or reload it after applying changes as needed.

If you want a fully in-process SillyTavern plugin (loaded by the ST server itself) instead of this standalone service, tell me and I will adapt this code to be an in-repo plugin for your local ST installation.
