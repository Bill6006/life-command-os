# Private alpha — read this before you put anything real in

**Status:** Current from Phase 6, Prompt 7B.
**Short version:** it is now safe enough to use for real. Take a backup on day one, and
open it once to prove the passphrase works.

---

## 1. What changed

Until now the honest answer to "can I put my life in this?" was no. There was no
encrypted backup and no tested recovery, so a cleared browser profile meant everything
was gone. Both now exist, and both are tested — including a full recovery onto a
profile that had never seen the data, driven through the real interface on the exact
build that gets deployed.

So: yes, with the three habits below.

## 2. The three things that actually matter

### Take a backup, and open it

Data & Privacy → Backup. It writes one encrypted file containing every record you have.

Then do the part people skip: **open it**. Load it back through Restore → Check this
backup on the same device. It costs a minute and it converts "I have a backup" from a
belief into a fact. A backup nobody has ever opened is a hope.

The app nags you about this — a record on the device with no backup is the one thing
Data & Privacy marks *Act now*.

### Understand the passphrase

**Nobody can recover it.** Not you, not me, not Anthropic, not GitHub. There is no
reset link, no support address, and no back door — the file is encrypted with a key
derived from the passphrase and nothing else, which is exactly why the file is safe to
put in cloud storage or on a USB stick.

Use several unrelated words rather than a short scramble. Twelve characters is the
minimum the app accepts; four or five random words is far stronger and far easier to
remember. Write it somewhere physical.

If you lose it, the backup is permanently unreadable. That is a property of the design,
not a defect.

### Keep the file somewhere else

The point of a backup is surviving something that destroys the original. A backup file
sitting only in the Downloads folder of the phone you are backing up does not do that.

## 3. What this app cannot protect you from

Read this section rather than skimming it. Every claim below is a limit, and the reason
they are written down is that the alternative is you assuming otherwise.

**Local storage is not encrypted.** Your records sit in this browser's IndexedDB in the
clear. The *backup file* is encrypted; the live database is not. A browser page cannot
encrypt its own storage at rest and still open without a passphrase every single time,
and pretending otherwise would be the single most dishonest thing this product could
do.

**The application lock is a curtain, not a vault.** It keeps content off the screen. It
does not encrypt anything, and anyone with your unlocked device and thirty seconds of
developer tools can read every record without going near it. It is genuinely useful for
a phone handed to someone or left on a desk, and useless against a compromised device,
a forensic extraction, or another profile on the same machine.

Forgetting the lock passphrase costs you nothing — turn the lock off from Data &
Privacy. That is deliberate, and it is why the lock passphrase and the backup
passphrase should not be the same thing.

**The browser can delete your data on its own.** Browsers evict storage from sites
under pressure. Data & Privacy will ask for persistent storage if it has not been
granted, but the browser decides, and on some platforms it decides silently. Your
backup is the only real protection.

**Nothing is synced.** One device, one browser profile. A second device does not see
your records unless you carry a backup to it. There is no server and no account, which
is the entire point, and this is what that costs.

## 4. What leaves the device

Nothing, unless you save a file and move it yourself.

There is no server, no account, no analytics, no telemetry, and no external AI. This is
verified rather than asserted: a browser test drives a full session on the production
build — check-in, private note, backup, export — records every network request the page
makes, and fails if any of them goes anywhere but this origin.

## 5. Backup versus export — do not confuse these

|  | **Backup** | **Readable export** |
|---|---|---|
| Purpose | Recovery | Thinking, or pasting elsewhere |
| Encrypted | Yes, AES-256-GCM | No |
| Complete | Every record, exactly | Deliberately partial |
| Can restore | Yes | **No, never** |
| Sensitive content | All of it, encrypted | Excluded unless you ask |

The export is a readable summary. It **cannot restore anything**, and it says so in its
own first three lines so that a file found in six months identifies itself correctly.

Every sensitive class — child, health, money, workplace, relationship, faith, notes,
location, private patterns — is excluded from an export until you explicitly include
it. A record whose sensitivity was never classified is treated as the most private
class and withheld, so nothing is included by accident. When a field is withheld you
see `[withheld: health]` rather than nothing at all, because an invisible omission
reads as an absence of evidence, which is a different and misleading claim.

## 6. Notifications — deliberately not built

They are off, because they do not exist. This is a decision, not an omission.

A local-first web app has two ways to notify you, and neither survives contact with
this product's constraints:

1. **Push notifications need a push server.** That means an endpoint that knows your
   device and receives messages about you — a server, in an app whose central promise
   is that there is no server. It would also need the recommendation logic to run
   somewhere other than your device.
2. **Local notifications need the page to be running**, in which case you are already
   looking at the app and a notification tells you nothing you could not see.

There is no third option that is honest. The requirements say notifications must be off
by default, opt-in, quiet-hours-aware, and free of guilt, streak, and inactivity
pressure — all true of a feature that does not exist. If a genuine need appears later
it can be revisited in Phase 8 or 10 with the tradeoff stated plainly, which is a
better outcome than a half-built version now.

## 7. If something goes wrong

**A restore looks wrong.** Data & Privacy → Restore points. One is saved automatically
before every restore, and rolling back returns your records exactly as they were. The
five most recent are kept.

**A write fails.** The app tells you and nothing is saved — writes are atomic, so there
is no half-applied state to clean up. If it says storage is full, take a backup and free
space.

**Another tab updated the app.** This tab stops saving rather than writing through an
old schema, and says so. Reload.

**The app will not open, or the data looks damaged.** Do not enter anything further.
Open a fresh browser profile and restore your most recent backup there. This is exactly
the path the tests exercise.

## 8. What is still missing

- **Only three life areas are active** — time and capacity, direction and commitments,
  career and learning. Health, fatherhood, relationships, faith, home, and money arrive
  in Phase 7.
- **Only one belief pattern is derived.** The learning machinery is general; the
  evidence to feed it is not there yet.
- **Sleep and food are captured but have no Health domain to live in yet.** They are
  recorded under time and capacity, classified as health data for privacy, and Phase 7
  gives them a proper home without re-entering anything.
- **Deletion is undecided.** There is no delete control, deliberately. Correcting a
  record and deleting it are different operations, and shipping a control before
  deciding what it means would be worse than not having one.
- **The browser matrix is Chromium only** until Phase 10.
