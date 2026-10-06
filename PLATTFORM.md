# Plattform

Was für dieses Repo auf moosburg.eu gilt. Das Übergreifende steht in
`moosburg-eu/BRIEFING.md`.

## Adressen

| Ausspielung | Adresse | Workflow |
|---|---|---|
| GitHub Pages | `bagruber.github.io/innenstadt/` | `.github/workflows/pages.yml` |
| moosburg.eu | `moosburg.eu/innenstadt/` | `.github/workflows/moosburg-eu.yml` |

Beide liegen unter `/innenstadt/`, deshalb gibt es nur einen Build und kein
`build:hostinger`. Bekommt das Projekt eine eigene Domain, braucht diese
Ausspielung `--base=/` als eigenen Script-Eintrag; `vite.config.ts` bleibt
dann bei `/innenstadt/`.

## Deploy

Push auf `main` startet beide Workflows. Der FTP-Workflow braucht drei
Actions-Secrets im Repo, dieselben Werte wie in den anderen Repos:
`FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`. Sie gehören in die
Repo-Einstellungen, nie in eine Datei — das Repo ist öffentlich.

```bash
gh secret set FTP_HOST -R bagruber/innenstadt
gh secret set FTP_USER -R bagruber/innenstadt
gh secret set FTP_PASSWORD -R bagruber/innenstadt
```

## Eingetragen in moosburg-eu

Laut Briefing gehört ein neues Projekt in die `exclude`-Liste des
Portal-Workflows (`innenstadt/**`). `llms.txt` und `sitemap.xml` erst zum
Start der Beteiligung; bis dahin trägt die Seite `noindex`.

## Zählen

`index.html` bindet `/assets/zaehler.js` ein. Auf GitHub Pages läuft der
Aufruf absichtlich ins Leere.
