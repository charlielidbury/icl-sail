// Printable race schedule. Rendered by scripts/schedule-pdf.ts, which passes
// the data as JSON with `--input data=...` (run it with `--json` to see the
// shape), and in the browser by src/schedule-pdf/compile.ts (/scheduler). The
// data is built by src/schedule-pdf/document.ts. `summary` may have several
// lines.

#let data = json(bytes(sys.inputs.data))
#let accent = rgb(data.accent)
#let nflights = data.flights.len()

// Denser type for more flights; 4+ flights also switch to landscape.
#let (font-size, row-inset) = if nflights <= 2 { (9pt, 3.4pt) } else if nflights == 3 { (8pt, 3pt) } else { (7.5pt, 2.6pt) }

#let rule = 0.5pt + luma(200)
#let cycle-rule = 0.6pt + luma(140)
#let strong-rule = 1.1pt + luma(70)
#let stripe = luma(243)
// Race numbers and the cells with teams in them are shaded; the other flights'
// cells stay white, so each race reads as one grey band.
#let shade = luma(222)

#set document(title: data.title + " " + data.subtitle)
#set page(
  paper: "a4",
  flipped: nflights >= 4,
  margin: (x: 12mm, top: 12mm, bottom: 16mm),
  footer: context {
    set text(7pt, fill: luma(120))
    [#data.title · #data.subtitle]
    h(1fr)
    [Generated #data.generated · Page #counter(page).display() of #counter(page).final().first()]
  },
)
#set text(
  font: ("Geist", "Libertinus Serif"),
  size: font-size,
  fill: luma(15),
)

// Title
#grid(
  columns: (1fr, auto),
  align: (left + bottom, right + bottom),
  stack(
    spacing: 2.5mm,
    text(20pt, weight: "bold", fill: accent, tracking: 0.12em, upper(data.title)),
    text(11pt, weight: "medium", fill: luma(70), data.subtitle),
  ),
  text(8.5pt, fill: luma(90), data.summary),
)
#v(3mm)

// A half-flight's header cell, coloured like its sails, with its sail numbers
// underneath if there are any.
#let half-header(h) = table.cell(
  fill: rgb(h.fill),
  text(fill: rgb(h.text), {
    text(weight: "semibold", h.name)
    if h.numbers.len() > 0 {
      linebreak()
      text(size: 0.85em, h.numbers.map(str).join(", "))
    }
  }),
)

// Shrinks a team name to fit its cell instead of wrapping it.
#let fit(name) = layout(size => {
  let body = text(name)
  let width = measure(body).width
  if width <= size.width { body } else { scale(size.width / width * 100%, reflow: true, body) }
})

// A rule above each race where the flights come round again (when its flight
// is not after the previous race's), boxing every rotation.
#let cycle-starts(races) = range(races.len()).filter(k => (
  k == 0 or races.at(k).flight <= races.at(k - 1).flight
))

#let schedule-table(races) = table(
  columns: (11mm,) + (1fr,) * (2 * nflights),
  align: (x, y) => if x == 0 { right + horizon } else { center + horizon },
  inset: (x: 3pt, y: row-inset),
  // The header keeps a full grid; body lines are added below.
  stroke: (x, y) => if y < 2 { rule } else { none },
  table.header(
    table.cell(rowspan: 2, align: right + bottom, fill: shade, text(weight: "bold")[Race]),
    ..data.flights.map(f => table.cell(
      colspan: 2,
      fill: luma(228),
      text(weight: "bold", f.name),
    )),
    ..data.flights.map(f => f.halves.map(half-header)).flatten(),
  ),
  table.hline(y: 2, stroke: strong-rule),
  ..cycle-starts(races).slice(1).map(k => table.hline(y: 2 + k, stroke: cycle-rule)),
  table.hline(y: 2 + races.len(), stroke: cycle-rule),
  table.vline(x: 0, start: 2, stroke: cycle-rule),
  table.vline(x: 2 * nflights + 1, start: 2, stroke: cycle-rule),
  ..range(nflights).map(i => table.vline(x: 1 + 2 * i, stroke: strong-rule)),
  // A hairline gap between a race's two team names.
  ..range(nflights).map(i => table.vline(x: 2 + 2 * i, start: 2, stroke: 1pt + white)),
  ..races
    .map(r => (
      table.cell(fill: shade, text(weight: "bold", str(r.number))),
      ..range(nflights)
        .map(i => if r.flight == i {
          (table.cell(fill: shade, fit(r.left)), table.cell(fill: shade, fit(r.right)))
        } else { ([], []) })
        .flatten(),
    ))
    .flatten(),
)

#for section in data.sections {
  if data.sections.len() > 1 {
    block(above: 5mm, below: 2.5mm, text(12pt, weight: "bold", fill: accent, section.title))
  }
  schedule-table(section.races)
}

// Each team's races, coloured by the boats they sail in.
#let race-chip(r) = box(
  fill: rgb(r.fill),
  stroke: if r.fill == "#ffffff" { 0.6pt + luma(140) } else { none },
  radius: 2pt,
  inset: (x: 3pt, y: 2pt),
  baseline: 2pt,
  text(fill: rgb(r.text), weight: "semibold", str(r.number)),
)

#if data.teams.len() > 0 {
  block(breakable: false, width: 100%, above: 7mm)[
    #text(12pt, weight: "bold", fill: accent)[Races by team]
    #h(3mm)
    #text(7.5pt, fill: luma(90))[Race numbers are coloured by the boats the team sails in.]
    #v(1mm)
    #table(
      columns: (auto, 1fr),
      align: (left + horizon, left + horizon),
      inset: (x: 4pt, y: 3pt),
      stroke: rule,
      fill: (x, y) => if calc.odd(y) { stripe },
      ..data.teams
        .map(t => (
          text(weight: "semibold", t.name),
          t.races.map(race-chip).join(h(2.5pt)),
        ))
        .flatten(),
    )
  ]
}
