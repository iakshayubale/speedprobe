# Contributing to SpeedProbe

Thanks for your interest in improving SpeedProbe! This guide explains how to set
up the project, the conventions we follow, and how to propose changes.

## Code of Conduct

By participating in this project you agree to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md). Please be respectful and constructive.

## Getting started

1. **Fork** the repository and clone your fork.
2. Serve the project over HTTP (ES Modules will not load from `file://`):

   ```bash
   python3 -m http.server 8848
   # or: npm start
   ```

3. Open <http://localhost:8848> and confirm a test runs end to end.

There is no build step or dependency to install — the app is plain HTML, CSS and
JavaScript modules.

## Project conventions

- **Vanilla, dependency-free.** Please do not introduce frameworks, bundlers or
  runtime dependencies without discussion in an issue first.
- **One responsibility per module.** New behaviour usually belongs in a focused
  module under `assets/js/`. See the architecture table in the
  [README](README.md#architecture).
- **No globals.** Modules communicate through imports/exports, not `window`.
- **Real data only.** Measurements must reflect genuine network behaviour — no
  mocked or fabricated results.
- **Privacy first.** No ads, analytics, trackers, accounts, or third-party calls
  beyond what is strictly required to measure the connection.
- **Document intent.** Use concise JSDoc on exported functions and explain any
  non-obvious networking workarounds in comments.
- **Formatting.** Two-space indentation, semicolons, single quotes. An
  [`.editorconfig`](.editorconfig) is provided.

## Making a change

1. Create a branch: `git checkout -b feature/short-description`.
2. Make your change in small, focused commits with clear messages.
3. Manually test in at least one Chromium-based browser **and** Safari or
   Firefox — cross-origin behaviour differs noticeably between them.
4. Make sure there are no console errors and that history, sharing and all
   sections still work.
5. Open a pull request describing **what** you changed and **why**.

## Reporting bugs & ideas

Open an issue with:

- What you expected to happen and what actually happened.
- Your browser and operating system.
- Steps to reproduce, plus any console output.

Feature ideas are welcome too — please describe the use case.

Thank you for helping make SpeedProbe better!
