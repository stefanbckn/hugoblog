# bckn.be — Hugo-blog

Persoonlijke blog van Stefan Bocken: posts en microblog-notes, in het Nederlands.
Hugo met het theme anubis2 als git-submodule, gehost op Netlify.

## Build en lokaal draaien

```bash
hugo server            # lokaal op http://localhost:1313
hugo --gc --minify     # zelfde commando als Netlify (netlify.toml)
```

- **Hugo-versie:** `HUGO_VERSION` in `netlify.toml` is de bron (nu 0.160.1). Lokaal dezelfde
  versie gebruiken; het theme vereist minstens 0.146 (nieuw template-systeem).
- Een build moet slagen zonder nieuwe waarschuwingen. De enige gekende waarschuwing is
  `found no layout file for "notes" for kind "home"` (komt van de `notes`-output in `hugo.toml`).
- `public/` is build-output en staat in `.gitignore`. Test-builds liever met `-d` naar een map
  buiten de repo.
- Na een build nakijken: `public/robots.txt` blokkeert niets in productie en bevat de
  Sitemap-regel; `index.xml`, `notes/index.xml` en `sitemap.xml` zijn geldige XML.

## Content

| Soort | Map | Kenmerken |
| --- | --- | --- |
| Posts | `content/posts/` | `title`, `slug`, `categories`, `tags`; bestanden vaak `JJJJ-MM-DD-Titel.md` of een bundle-map |
| Notes (microblog) | `content/notes/` | Geen titel; `type: notes`, `url: /notes/JJJJ/MM/DD/<naam>/`, categorie `micro` |
| Pagina's | `content/about.md`, `now.md`, … | Gewone pagina's |

- Afbeeldingen staan in `static/img/` (notes in `static/img/notes/`).
- Notes worden ook van elders naar `main` gepusht (commits "microblogging"), dus lokaal loopt
  `main` vaak achter.
- Notes hebben geen titel. Elke template die `.Title` toont, moet voor `.Type "notes"` iets
  anders tonen (de datum, zoals `note-summary.html`), anders verschijnen er lege links.

## Theme en overrides

- Submodule `themes/hugo-theme-anubis2` wijst naar het **officiële**
  `github.com/hugo-theme-anubis2/hugo-theme-anubis2`, vastgezet op een release-tag (nu `v1.8.0`).
  De vroegere fork `stefanbckn/hugo-theme-anubis2` is gearchiveerd — niet meer gebruiken.
- **Nooit bestanden in `themes/` aanpassen.** Alle aanpassingen gaan via `layouts/` in de blog,
  in de nieuwe paden (`_partials/`, `_markup/`, `_shortcodes/`, `page.html`, `term.html`).
  Geen oude `partials/`, `shortcodes/` of `_default/` meer aanmaken.
- Eigen overrides en waarom ze bestaan:
  - `_partials/head/head.html` — `author.name`, copyright, h-card (`head/hcard.html`),
    SimpleAnalytics (`params.SimpleAnalytics.enabled`).
  - `_partials/footer.html` — SimpleAnalytics-badge en IndieWeb Webring.
  - `_partials/post-info.html` — `author.name` en `p-category` (microformats).
  - `page.html` — klasse `post-card`.
  - `term.html` — paginering op tag-/categoriepagina's en notes via `note-summary.html`.
  - `rss.xml` — hoofdfeed bevat notes naast de `mainSections`.
  - `_markup/render-heading.html` — tussentitels zonder `##`.
  - `_markup/render-link.html` — links in content zonder `noreferrer` (enkel `rel="noopener"`).
  - `robots.txt` — met Sitemap-regel.
  - `notes/` — eigen list, single en feed voor notes.
- Een override is een kopie van een theme-bestand. Bij een theme-update eerst per override
  vergelijken met de nieuwe theme-versie en de eigen wijzigingen opnieuw toepassen op het nieuwe
  bestand, anders mis je verbeteringen van het theme.

### Theme updaten

1. Branch aftakken (zie Git), dan `git -C themes/hugo-theme-anubis2 fetch --tags` en
   `git -C themes/hugo-theme-anubis2 checkout <nieuwe tag>`.
2. Vereist de nieuwe versie een nieuwere Hugo, dan `HUGO_VERSION` in `netlify.toml` mee.
3. Overrides nakijken (hierboven), bouwen, gegenereerde site vergelijken met een build van `main`.
4. PR openen en de Netlify deploy preview nakijken vóór de merge.

## Domein en SEO

- `baseURL = 'https://bckn.be/'`. `bckn.be` is het primary domain in Netlify; `www.bckn.be`
  stuurt met een 301 door naar `https://bckn.be/`. Canonicals, sitemap en feeds moeten naar
  `https://bckn.be/` wijzen.
- `enableRobotsTXT = true`; buiten productie geeft `robots.txt` `Disallow: /`.
- Gekend en bewust nog niet aangepakt: canonical van gepagineerde pagina's (`/page/N/`) wijst
  naar pagina 1.
- Interface-teksten van het theme (bv. "to old posts") blijven in het Engels — bewuste keuze.

## Git en releases

- **Eerst `git fetch` / `git pull`, dan pas committen of aftakken.** Er komen notes van elders
  binnen; een push op een verouderde `main` wordt geweigerd.
- **Nooit pushen zonder expliciet akkoord op dat moment.** Eén akkoord geldt niet voor latere pushes.
- **Content** (posts, notes) mag rechtstreeks op `main`.
- **Techniek** (theme, Hugo-versie, layouts, config, `netlify.toml`) gaat via een branch + PR,
  zodat Netlify een deploy preview maakt. Netlify deployt enkel `main`.
- Branch aanmaken met `git switch -c <naam> --no-track origin/main`, zodat een gewone push niet
  op `main` belandt. Controle: `git config --get branch.<naam>.merge` mag niet `refs/heads/main` zijn.
- `gh` is ingelogd als `stefanbckn`; remote is SSH (`git@github.com:stefanbckn/hugoblog.git`).
