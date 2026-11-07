// labels.js: every tappable person and place in the scene: what it is, its name, a short line (a quotation from the
// source the scene is drawn from, with its reference, or a plain sentence of history) and, if wanted, a second line.
// The family can change the wording here; the plug-ins only refer to the keys.
//   key: { type 'person' | 'place', kind (the small line), name, line, teach (optional) }
window.LABELS = {
  oak: { type: 'place', kind: 'A tree', name: 'The old oak', line: 'Every scene starts with something to tap.' },
  walker: { type: 'person', kind: 'Traveller', name: 'A walker', line: 'Tap a person to see who they are.' },
};

// The story panel at the top left: the day's chapters in cycle seconds. The ones happening now open to show two
// sentences a child can follow and the source; tapping one jumps the scene there. ?toc=0 hides the panel.
//   { from, to, title, text, ref }
window.STORY = [
  { from: 0, to: 60, title: 'Morning', text: 'The walker sets out across the valley. Every scene tells its day in a few chapters like this.', ref: 'Where the line comes from, quoted exactly.' },
  { from: 50, to: 120, title: 'The walk back', text: 'Chapters can overlap; the two that started last show their words.', ref: '' },
  { from: 120, to: 180, title: 'Evening', text: 'The light goes gold, then blue, and the lamps come on.', ref: '' },
];
