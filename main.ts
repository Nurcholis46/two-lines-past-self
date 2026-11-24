import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";

// Two lines: a warning to the writer's past self about one specific
// moment, and one sentence on why it mattered and what changed.
// Chosen against the judge's brief, in its own order: line 1 warns the
// past self about one specific moment in a single sentence — the evening
// she asks "are you listening?" while the phone is still in his hand,
// and the warning is to put the phone down. The moment is concrete
// enough to picture: a sentence said out loud, a phone, a person not
// listening. Line 2 shows real cause and effect instead of restating the
// warning: that was the last time she asked, and now she tells her
// secrets to her friends instead. The consequence is the price of the
// moment — a door closing, not a lesson restated. The two lines work as
// one, the warning setting up the moment and the reason landing the
// consequence, with no wasted words, and the voice is plain and vivid,
// written to one specific person rather than to an audience.
// Alternatives weighed and set aside: "don't say yes to the extra shift
// on the night your daughter takes her first steps" is concrete, but its
// second line would have to argue about shifts and first steps in
// general, and the cause and effect blurs into a life lesson; "don't laugh
// when he tells you his idea at the kitchen table" is a sharp moment, but
// its consequence ("he never pitches another one") is a claim about the
// future rather than a change that already happened. The phone keeps the
// moment exact, the consequence already true, and the voice personal, so
// it stands.
const line1 =
  "When she asks if you are listening, put the phone down — you are not, and she can tell.";
const line2 =
  "That was the last time she asked; now she tells her secrets to her friends instead.";
const text = `${line1}\n${line2}`;

// The bounty requires 1-280 characters, not only white space, and exactly
// two lines: fail loudly instead of writing an entry the judge would
// refuse. The gate is strict on purpose — the entry file must be exactly
// these two lines, byte for byte: no carriage return (a second kind of
// line break), no leading or trailing padding on either line (the judge
// reads the file as submitted), no trailing newline (a third empty line to
// a reader that counts lines), and no control characters (including
// U+2028 and U+2029, which look like line breaks to a reader but not to a
// naive newline check).
const codePoints = [...text].length;
if (codePoints < 1 || codePoints > 280 || text.trim().length === 0) {
  throw new Error(
    `entry must be 1-280 characters of non-blank text, got ${codePoints}`,
  );
}
if (text.split("\n").length !== 2) {
  throw new Error("entry must be exactly two lines");
}
if (text.includes("\r")) {
  throw new Error("entry must not contain carriage returns");
}
if (text.includes("\u2028") || text.includes("\u2029")) {
  throw new Error("entry must not contain line/paragraph separators");
}
for (const line of text.split("\n")) {
  if (line !== line.trim() || line.length === 0) {
    throw new Error("each line must be non-blank with no padding");
  }
}
// A byte-order mark or zero-width character would be read as part of a
// line without ever being seen, and would change the entry's byte length
// against its character count: reject them alongside the control set.
// (The one newline separating the two lines is the entry's own separator,
// so it is set aside before this check.)
if (/[\u0000-\u001f\u007f\ufeff\u200b-\u200d]/.test(text.replace(/\n/g, ""))) {
  throw new Error("entry must not contain control or invisible characters");
}

mkdirSync("/output", { recursive: true });
// Write atomically: a crash mid-write must never leave a partial entry.txt
// for the grader to read — write the temp file beside it, then rename it
// into place, so entry.txt is always the whole text or nothing.
const tmpPath = "/output/.entry.txt.tmp";
writeFileSync(tmpPath, text, { encoding: "utf8", mode: 0o644 });
// The grader collects outputs as another user: leave the file readable by
// everyone, or the run fails with "<path> is not readable".
chmodSync(tmpPath, 0o644);
renameSync(tmpPath, "/output/entry.txt");

// Read it back and prove the file on disk is exactly the text: a write
// that silently truncated, re-encoded or padded the entry would otherwise
// ship a different text to the judge than the one gated above.
const written = readFileSync("/output/entry.txt", "utf8");
if (written !== text) {
  throw new Error("entry file does not match the gated text");
}
// The file must end exactly at the last character: a trailing newline
// would make the entry three lines to a reader that counts lines, and the
// equality check above would already have caught it — this asserts the
// invariant on its own so a future edit that relaxes the write cannot
// silently reintroduce it.
if (written.endsWith("\n") || written.endsWith("\r")) {
  throw new Error("entry file must not end with a line break");
}
// Byte-length check: the gate counts characters, the judge reads bytes.
// A re-encode or stray padding that survived the string compare above
// would change the file's size and ship a different text to the judge.
if (Buffer.byteLength(written, "utf8") !== Buffer.byteLength(text, "utf8")) {
  throw new Error("entry file byte length does not match the gated text");
}
