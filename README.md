# Roel de Cort

Personal technical portfolio and field-notes site built with AstroPaper.

## Stack

- Astro
- AstroPaper
- TypeScript
- Markdown and MDX content
- pnpm
- RSS, sitemap, Pagefind search
- GitHub Pages deployment through GitHub Actions

## Local Development

```bash
pnpm install
pnpm start
pnpm stop
```

Managed local server commands:

```bash
pnpm local:start
pnpm local:status
pnpm local:stop
pnpm local:restart
pnpm local:logs
```

The managed server runs at `http://127.0.0.1:4321/` by default and writes logs to `.astro/local-server.log`.

Build and preview the static site:

```bash
pnpm build
pnpm check:links
pnpm local:start:preview
```

Run the same local quality gate as CI:

```bash
pnpm check
```

## Deployment

The site deploys from `main` using `.github/workflows/deploy.yml`. Configure GitHub Pages with **GitHub Actions** as the source.

Pull requests run `.github/workflows/ci.yml`, which checks linting, formatting, the production build, and internal links in `dist/`.
Dependency updates are proposed weekly by Dependabot for pnpm packages and GitHub Actions.

`public/CNAME` currently contains:

```text
decort.tech
```

The site URL in `astro-paper.config.ts` is configured as `https://decort.tech`.

## Content

Posts live in `src/content/posts/`. Topic folders are used for durable paths:

- `openbao/`
- `kubernetes/`
- `gitlab/`
- `platform-engineering/`
- `virtualization/`
- `security/`
- `automation/`
- `devops-culture/`

Topic index pages are generated from `src/data/topics.ts`. Add or update a topic there instead of creating another page file.

Use lowercase, consistent tags. Prefer plain Markdown. Use MDX only when a post needs a component such as `Callout`.
