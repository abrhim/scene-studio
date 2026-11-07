// labels.js: every tappable person and place in the scene: what it is, its name, a short line (a quotation from the
// source the scene is drawn from, with its reference, or a plain sentence of history) and, if wanted, a second line.
// The family can change the wording here; the plug-ins only refer to the keys.
//   key: { type 'person' | 'place', kind (the small line), name, line, teach (optional) }
window.LABELS = {
  oak: { type: 'place', kind: 'A tree', name: 'The old oak', line: 'Every scene starts with something to tap.' },
  walker: { type: 'person', kind: 'Traveller', name: 'A walker', line: 'Tap a person to see who they are.' },
};
