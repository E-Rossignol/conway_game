# Conway Game (React + TypeScript + Tailwind)

Quick instructions to run this project locally.

## Prerequisites
- Node.js (recommended >= 16)
- npm (comes with Node) or yarn

## Install
Open a terminal and run:

```bash
cd c:\Personal_Projects\conway_game
npm install
# or
# yarn
```

## Run in development
Depending on how the project was scaffolded:

- If the project uses Vite (common for modern React + TS setups):
  ```bash
  npm run dev
  ```
  Open: http://localhost:5173

- If the project uses Create React App:
  ```bash
  npm start
  ```
  Open: http://localhost:3000

If you're unsure which to use, check `package.json` scripts (look for `dev`, `start`, or `preview`).

## Build for production
```bash
npm run build
```
- For Vite you can preview the built app with:
  ```bash
  npm run preview
  ```
- Or serve `dist` with any static server:
  ```bash
  npx serve -s dist
  ```

## Troubleshooting
- If the port is already in use, the dev server will suggest another port or you can stop the conflicting process.
- If Tailwind styles don't appear, ensure PostCSS/Tailwind config is present and that the dev server is restarted after adding configs.
- Check the terminal output for errors and refer to `package.json` scripts for exact commands.

## Notes
- This repository contains React + TypeScript source under `src/` (example: `src/App.tsx`).
- Adjust commands if you prefer `yarn` instead of `npm`.

Enjoy developing!
