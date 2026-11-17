# Contributing to NotBitLee

Thanks for helping. NotBitLee is a small project and stays small on purpose: a link shortener that anyone can deploy to their own Cloudflare account in one click. Contributions that keep it simple, fast and easy to self-host are the most welcome.

## Ways to help

- **Report a bug.** Open an issue with the bug template. Include what you did, what you expected and what happened.
- **Suggest a feature.** Open an issue with the feature template. Say what problem it solves before describing the solution.
- **Improve the docs.** Typos, unclear steps and missing screenshots in the README are all fair game.
- **Send a pull request.** For anything bigger than a small fix, open an issue first so we can agree on the approach before you spend time on it.

Security problems are different: please don't open a public issue. See [SECURITY.md](SECURITY.md).

## Set up locally

You need Node.js 22 or newer.

```bash
git clone https://github.com/zimamedia/notbitlee.git
cd notbitlee
npm install
cp .dev.vars.example .dev.vars    # set an email and password to sign in with
npm run db:migrate:local
npm run dev
```

Open `http://127.0.0.1:8788/admin`. Short links are served at `http://127.0.0.1:8788/<back-half>`.

## Before you open a pull request

Run all four checks. CI runs them too.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

- Add or update tests in `tests/` for anything in `shared/` or any behaviour change.
- Database changes go in a **new** file in `migrations/`. Never edit a migration that has already shipped: people's databases have run it.
- Keep the one-click deploy working. A change that needs a new secret or a manual step must explain it in the README and in `package.json` under `cloudflare.bindings`.
- Keep dependencies few. Every package added makes self-hosting heavier.
- Write UI text in plain language. Say what happened and what to do next.

## Where things live

| Folder | What's in it |
| --- | --- |
| `worker/` | The Cloudflare Worker: redirects, the `/api` JSON API and sign-in |
| `src/` | The React dashboard served at `/admin` |
| `shared/` | Code both sides use: slug rules, routing, the CSV importer, click summaries |
| `migrations/` | The D1 database schema, applied on every deploy |
| `tests/` | Unit tests (Vitest) |
| `site/` | The notbitlee.com landing page, deployed separately (see `site/README.md`) |

## Pull requests

- One change per pull request, with a clear title.
- Describe what changed and why, and how you tested it. Add a screenshot for UI changes.
- By sending a pull request you agree that your contribution is released under the project's [MIT licence](LICENSE).

## Code of conduct

Everyone taking part is expected to follow the [code of conduct](CODE_OF_CONDUCT.md).
