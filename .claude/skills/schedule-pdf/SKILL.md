---
name: schedule-pdf
description: Generate a competition's printable race schedule PDF (the "Qualifying Schedule" document on a competition's home page) from Supabase or from a schedule CSV. Use when a schedule PDF needs creating or refreshing.
argument-hint: [competition id, e.g. sixpack]
allowed-tools: Bash, Read, Edit
---

# Schedule PDF Skill

Renders a race schedule to `public/<competition>/schedule.pdf` with Typst.
`scripts/schedule-pdf.ts` gathers the races and `scripts/schedule.typ` lays them out:
a title, then one table per league with a column pair per flight, each half's
header coloured like its sails. An optional "Races by team" index (`--teams`) lists
each team's race numbers, coloured by the boats it sails in. Four or more flights switch
to landscape.

The site also has a live version at `/schedule` (src/app/schedule/), with the same
table built from the current races in every league and a "Print or save as PDF"
button. Point people there when the schedule may still change; generate a PDF when a
fixed document is wanted (notice boards, emails, the home page's documents list).

## Commands

Run from the repo root inside the nix dev shell (it provides `typst`, `supabase` and
the Geist font via `TYPST_FONT_PATHS`). Database reads need `supabase login` and
`supabase link` (see the `db` skill).

```bash
# From the database (the usual case): writes public/<competition>/schedule.pdf
node scripts/schedule-pdf.ts <competition>

# From a schedule CSV + config.json, before it has been imported
node scripts/schedule-pdf.ts --config schedule/<competition>/config.json
```

Options:
- `--league quali,semis/gold` - leagues to include, in race order (default `quali`).
  Several leagues become separate tables and the subtitle becomes "Race Schedule".
- `--title "London Six Pack"` - heading; defaults to `competition.name` in the database.
- `--out path.pdf` - somewhere other than `public/<competition>/schedule.pdf`.
- `--teams` - add the "Races by team" index. Off by default, because schedules get
  printed and it usually spills onto an extra page. Only add it when asked.
- `--json` - print the data passed to the template instead of rendering.

## Steps

1. Generate the PDF with one of the commands above.
2. Look at it before publishing. Render pages to images and read them:
   ```bash
   nix shell nixpkgs#poppler-utils -c pdftoppm -r 70 -png public/<competition>/schedule.pdf /tmp/<scratch>/page
   ```
   Check the flight colours match the sails, no team name is unreadably small, and the
   race count in the top right is what you expect.
3. Link it from the competition's entry in `documents` in `src/app/home.tsx`, first in
   the list like the other competitions:
   ```ts
   {
     title: "Qualifying Schedule",
     description: "Qualifying schedule in typical table format",
     href: "/<competition>/schedule.pdf",
   },
   ```
4. Leave committing to the user unless asked.

## Gotchas

- Header colours come from the first colour word in each half's name ("Pink Stripe"
  is pink, "Blue Striped Jib" is blue). Names without a colour word get a light grey
  header. To add or tweak colours, edit `src/sail-colours.json` (shared with the `/schedule` page).
- Flights are ordered by the first race they sail, which matches the CSV's columns.
- Races with no team yet show their `lplaceholder`/`rplaceholder`, or "TBD".
- Long team names are shrunk to fit their cell rather than wrapped. If one looks tiny,
  the competition probably has too many flights for the page; try `--out` and compare.
- The date in the footer is when the PDF was generated, so regenerate after any
  schedule change; the PDF does not update itself.
- `--config` takes flight details from the config when it has them, and otherwise
  looks the flight ids up in the database; team names go through the config's `teams`
  map, as in `scripts/import-schedule.ts`.
