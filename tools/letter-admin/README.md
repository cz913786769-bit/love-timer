# Local Letter Admin

This tool edits only `assets/data/icp-safe-data.json` on the local machine.

## Start

```powershell
node tools/letter-admin/server.mjs
```

Open:

```text
http://127.0.0.1:4177
```

## Publish

After saving and reviewing the diff, run:

```powershell
tools/publish-letter.ps1
```

The publish script stops unless the only modified file is `assets/data/icp-safe-data.json`.
