// labels.js: every tappable person, place and radio message in "Hill 689, 16 April 1968", and the story panel.
// The plug-ins refer only to the keys (ctx.tag(key, getPos)); the family can change the wording here.
//
// Words on screen are record-only (DESIGN.md 5, DECISIONS.md "Words on screen"):
//   QUOTES holds the lines copied exactly from research.md section 14, by their Q/P ids (Q18 is flagged there and is
//   left out). tools/check-labels.mjs checks every one against research.md.
//   Every label carries `layer`: 'quote' (exact words, shown in quotation marks), 'paraphrase' (the gist of a source,
//   marked as paraphrase on screen) or 'reconstructed' (none yet: a later, marked layer; nothing here is invented).
//
// A label:
//   key: { type 'person' | 'place' | 'message', kind (the small line), name, line, layer, source, quote (Q/P id when
//          the line is one), line2 (optional second line, same shape), byCh (optional: [{ ch: [chapter ids], line,
//          layer, source, quote }], the first entry naming the current chapter replaces line) }
//   messages add: from, to, sent, received (clock strings, or null where the record is silent), ch (where it shows)
(function () {
  'use strict';
  const QUOTES = window.QUOTES = {
  Q1: "Captain Henry D. Banks led two reinforced platoons of Company A, 1st Battalion, 9th Marines on a patrol southwest of the battalion's perimeter on Hill 689 and a small adjoining hill.",
  Q2: "a nearby ridge that was covered with four-to-six-foot-high elephant grass",
  Q3: "ran into a reverse slope horseshoe shaped NVA bunker complex",
  Q4: "In rapid succession, first Hayden and then his platoon sergeant were killed.",
  Q5: "At noon, Banks reconsidered and asked for help.",
  Q6: "He ordered Himmer to attack from the south.",
  Q7: "Within moments, Himmer, both platoon commanders, a platoon sergeant, and several squad leaders fell with wounds.",
  Q8: "Banks reported to Lieutenant Colonel Cahill that he was engaged with an estimated North Vietnamese squad in heavily fortified positions, then refused Cahill's offer of help.",
  Q9: "Because of the necessity of the various radio relays, Meyers did not receive this message until 1543.",
  Q10: "request his current status and to ask if he needed any additional assistance",
  Q11: "At 1500, Companies A and C were both in desperate straits.",
  Q12: "nearly immobilized in the elephant grass by the intense enemy fire",
  Q13: "ordered his companies to evacuate their wounded and withdraw, leaving their dead",
  Q14: "Cahill logically assumed that the Marine who was rescued was the same Marine, Hunnicutt, who had called across the valley earlier in the day.",
  Q15: "About noon I guess, an Army Huey started flying around me, a spotter plane. The spotter plane dropped two red smokes on me and scared me to death. I thought they were going to blow me away. I tried to stand up and wave to them. I threw paper all over the place and waved, and one of the copters came right down on me about three times. I could see the man's face, and then finally he set down and one of the machine gunners came out and helped me into the plane.",
  Q16: "Hunnicutt claimed that Captain Himmer had still been alive as late as the afternoon of the 17th.",
  Q17: "Himmer was never seen alive again.",
  Q19: "Sergeant Hunnicutt treated the officer's wounds and then directed squad members into a bomb crater to await a lull in the enemy activity.",
  Q20: "At dusk he left the position and crawled across the fire-swept terrain to secure medical aid for himself and the other casualties trapped in the bomb crater.",
  Q21: "Sergeant Hunnicutt discovered his company commander lying in an open area, severely wounded.",
  Q22: "At the first rays of dawn, he managed to move the company commander to a covered position",
  Q23: "At approximately 1000, 'A' Company (-) was approaching the area of its earlier enemy contact of 13 April.",
  Q24: "The enemy was estimated at this time to be of Company size and observed to be in well prepared, well camouflaged, heavy fortified, mutually supporting bunkers.",
  Q25: "Supporting arms and air support could not be employed against the enemy positions with which Company 'A' was in contact, because of close proximity of friendly troops to the enemy.",
  Q26: "1/9 deployed 'C' Company (-) and Company 'D' (-) at approximately 1435 to reinforce 'A' Company, continue in the attack on the enemy allowing for extraction of casualties and to assist 'A' Company in breaking contact.",
  Q27: "At this time the 1/9 perimeter on Hill 689 came under enemy rockets, receiving 15 120mm rockets.",
  Q28: "Companies 'C' and 'D' then began withdrawing from the area at approximately 2115 H.",
  Q29: "The NVA were dug in a reverse slope defense and were supported by rockets, artillery and mortars. Because of the high elephant grass and the nature of the situation an accurate determination of enemy casualties was not obtained",
  Q30: "20 KIA's (bodies not recovered), 4 KIA's evacuated, 46 evacuated WIA's, 23 MIA's and 5 non-battle casualties",
  Q31: "the final casualty count totalled 38 Marines and 3 Navy corpsmen killed in action and 32 Marines wounded",
  Q32: "We will get them later.",
  P1: "The radio carried the order to Charlie Company to move out its 1st Platoon, at 2:30 PM.",
  P2: "Hunnicutt, in the crater, called to his lines for help; Kasminoff offered covering fire; Castaneda told him to get out of the crater.",
  P3: "Hartzell and Donnelly told Cahill on 17 April that sending more Marines up the hill would cost more killed and wounded, and Donnelly proposed a helicopter \"recon extract.\"",
  };

  // Where the words come from (research.md 15). Short forms used in the research, written out.
  const SRC = window.SOURCES = {
    DY: 'Shulimson et al., The Defining Year, 1968 (official history)',
    ComdC: '1/9 Command Chronology, April 1968',
    NC: "Cpl Hunnicutt's Navy Cross citation",
    HN: 'McGuire, "Rescuing the Walking Dead," HistoryNet 2020 (veteran accounts)',
    AAR: 'Pegasus after-action report, in the 1/9 Command Chronology',
    DU: 'More Than a Headstone, University of Denver (secondary)',
  };
  const s = (key, where) => SRC[key] + (where ? ', ' + where : '');
  // an exact line by id, or a marked paraphrase
  const Q = (id, source) => ({ line: QUOTES[id], layer: id[0] === 'P' ? 'paraphrase' : 'quote', quote: id, source });
  const P = (text, source) => ({ line: text, layer: 'paraphrase', source });
  const L = (type, kind, name, main, more) => Object.assign({ type, kind, name }, main, more || {});

  window.LABELS = {
    // ---------- people (DESIGN.md 5; named where a source names and places them, research.md 2) ----------
    himmer: L('person', 'Company C, 1/9', 'Capt Lawrence Himmer', Q('Q6', s('DY', 'pp. 313–314')), {
      byCh: [
        { ch: [6, 7], ...Q('Q7', s('DY', 'p. 315')) },
        { ch: [8, 9], ...Q('Q21', s('NC')) },
        { ch: [10, 11], ...Q('Q22', s('NC')) },
      ],
    }),
    cahill: L('person', 'Commanding 1/9', 'LtCol John J. H. Cahill', Q('Q13', s('DY', 'p. 315')), {
      byCh: [{ ch: [7], ...Q('Q32', s('HN', 'on the landing zone, about 1745')) }],
    }),
    banks: L('person', 'Company A, 1/9', 'Capt Henry D. Banks', Q('Q8', s('DY', 'p. 313')), {
      line2: Q('Q5', s('DY', 'p. 313')),
    }),
    hayden: L('person', '2d Platoon, Company A', '1stLt Michael P. Hayden', Q('Q4', s('DY', 'p. 313'))),
    connelly: L('person', 'Acting executive officer, Company C', '1stLt William C. Connelly',
      P('Took command of Company C when Himmer and the platoon commanders fell; stopped the artillery mission when rounds fell within 50 metres.', s('DY', 'pp. 314–315'))),
    hunnicutt: L('person', 'Squad leader, Company C', 'Cpl Hubert H. Hunnicutt III', Q('Q19', s('NC')), {
      byCh: [
        { ch: [8], ...Q('Q20', s('NC')), line2: Q('Q21', s('NC')) },
        { ch: [9], ...Q('Q21', s('NC')) },
        { ch: [10], ...Q('Q22', s('NC')) },
      ],
    }),
    cargile: L('person', 'Company D, 1/9', 'Capt John W. Cargile',
      P("Attacked across the ridge from north-west to south-east along Company A's right; the assault was stopped by sniper fire after about 300 metres.", s('DY', 'p. 315') + '; ' + s('ComdC', 'p. 11'))),
    lovely: L('person', 'Company A, 1/9', '2ndLt Francis B. Lovely Jr.',
      P('Took command of Company A when Banks was wounded, about 1730.', s('DY', 'p. 315'))),
    hartzell: L('person', 'Operations officer (S-3), 1/9', 'Capt Charles B. Hartzell',
      P('The battalion operations centre on Hill 689.', s('HN') + '; ' + s('ComdC', 'p. 3'))),
    donnelly: L('person', 'Executive officer, 1/9', 'Maj Joseph A. Donnelly',
      P('The battalion operations centre on Hill 689.', s('HN') + '; ' + s('ComdC', 'p. 3'))),
    engel: L('person', 'Air officer, 1/9', 'Capt Donald F. Engel',
      P('The battalion operations centre on Hill 689.', s('HN') + '; ' + s('ComdC', 'p. 3'))),
    hatcher: L('person', 'M60 gunner, 1st Platoon, Company C', 'Cpl Tommy "Hatch" Hatcher',
      P('About 50 yards below the top when the order came to move out; knocked down by a grenade from a spider hole, then wounded by a mortar round.', s('HN'))),
    rider: L('person', '2d Platoon, Company C', 'Sgt William Rider',
      P('Moved round the western flank and saw many NVA running up the hill: a reinforced company at least.', s('HN'))),
    panykaninec: L('person', '2d Platoon, Company C', 'PFC Panykaninec',
      P('Hit at the edge of a big crater and left for dead; rescued by an Army helicopter crew the next evening.', s('DY', 'p. 315') + '; ' + s('HN'))),
    crater6: L('person', 'Company C, in a bomb crater', 'Six Marines in a crater',
      Q('P2', s('HN', 'LCpl Ross Kasminoff and Cpl Henry Castaneda'))),
    brown: L('person', 'Company C', 'PFC David Dee Brown Jr.',
      P('Joined Company C on 12 April; killed on 16 April. The records read do not say where.', s('DU') + '; the official history does not name him')),
    meyers: L('person', 'Commanding 26th Marines, at Khe Sanh', 'Col Bruce F. Meyers', Q('Q9', s('DY', 'note, p. 314')), {
      line2: Q('Q10', s('DY', 'note, p. 314')),
    }),
    nva: L('place', 'North Vietnamese Army', 'Hidden positions',
      Q('Q29', s('AAR', 'ComdC p. 53') + '. The unit is disputed: 2d Battalion, 101st Regiment (AAR) or 66th Regiment (HN)')),
    medevac: L('place', 'Medevac, type not recorded', 'The first medevacs, about 1805',
      P('The first medevac helicopters arrived about 1805; Company C had set up another landing zone. The type is not recorded for these flights; shown as a UH-34D, the Marine medevac helicopter common at Khe Sanh that spring (HMM-363 still flew the UH-34D, and HMM-362 flew emergency medevacs to the hilltop positions).', s('ComdC', 'p. 11; DY pp. 461, 484 n.'))),

    // ---------- places (DESIGN.md 5) ----------
    hill689: L('place', 'Dong Dang, 691 m', 'Hill 689', Q('Q1', s('DY', 'p. 313'))),
    ridge: L('place', 'The battle ridge', 'The ridge', Q('Q2', s('DY', 'p. 313'))),
    bunkers: L('place', 'Bunkers, reverse slope', 'The horseshoe', Q('Q3', s('DY', 'note, p. 313') + ', Col Meyers'), {
      line2: Q('Q24', s('ComdC', 'p. 10')),
    }),
    grass: L('place', 'Elephant grass', 'The grass', Q('Q12', s('DY', 'p. 315'))),
    craters: L('place', 'B-52 craters', 'Bomb craters',
      P('Huge craters from the bombing covered the ridge; the squads sheltered in them and moved from crater to crater. One was the size of a swimming pool.', s('HN'))),
    czlz: L('place', 'Landing zone, Company C', 'Company C landing zone',
      P('Company C set up another landing zone for its casualties; the first medevacs arrived about 1805. Its place is not recorded.', s('ComdC', 'p. 11'))),
    alz: L('place', 'Landing zone, Company A', 'Company A landing zone',
      P('Company A set up a landing zone for the evacuation of casualties. Its place is not recorded.', s('ComdC', 'p. 11'))),
    hill552: L('place', 'XD 823 403, 552 m', 'Hill 552',
      P('Taken by 1/9 on the way to Hill 689, 4–8 April 1968.', s('ComdC', 'pp. 3, 8'))),
    base: L('place', 'Khe Sanh Combat Base, 3.8 km east', '26th Marines, Col Meyers', Q('Q9', s('DY', 'note, p. 314'))),
    gully: L('place', 'The east side of the hill', 'The gully',
      P('Hunnicutt was moving his company commander down the ridge toward the battalion perimeter when he fell into a gorge, and the two were separated.', s('DY', 'p. 316') + '; ' + s('NC'))),
    hill600name: L('place', 'The battle hill, 610 m', '"Hill 600"',
      P('The name is one veteran account\'s; the official history calls it only "a small adjoining hill" and "the ridge."', s('HN') + '; ' + s('DY', 'p. 313'))),

    // ---------- radio messages (DESIGN.md 5 and 9, research.md 4) ----------
    // ch: the chapter(s) in which the message is shown; sent / received: clock strings, null where silent
    msg_sitrep1: L('message', 'Radio · 1/9 to 26th Marines', 'SitRep #1', P('The battalion\'s first situation report of the day, logged out to the 26th Marines. Its contents are not recorded.', s('ComdC', 'p. 36')), { from: '1/9 operations centre, Hill 689', to: '26th Marines, Khe Sanh', sent: '0600', received: null, ch: [1] }),
    msg_spotreps: L('message', 'Radio · 1/9 to 26th Marines', 'Spot reports', P('Spot reports logged to the 26th Marines at 0959, 1020 and 1145. Their contents are not recorded.', s('ComdC', 'p. 36')), { from: '1/9 operations centre, Hill 689', to: '26th Marines, Khe Sanh', sent: '0959 · 1020 · 1145', received: null, ch: [3] }),
    msg_squad: L('message', 'Radio · Banks to Cahill', 'A squad, he says', Q('Q8', s('DY', 'p. 313')), { from: 'Capt Banks, Company A', to: 'LtCol Cahill, Hill 689', sent: null, received: null, ch: [3] }),
    msg_offer: L('message', 'Radio · Cahill to Banks', 'An offer of help', P('Cahill offers Company A help; Banks turns it down.', s('DY', 'p. 313')), { from: 'LtCol Cahill, Hill 689', to: 'Capt Banks, Company A', sent: null, received: null, ch: [3] }),
    msg_noon: L('message', 'Radio · Banks to Cahill', 'Asking for help', Q('Q5', s('DY', 'p. 313')), { from: 'Capt Banks, Company A', to: 'LtCol Cahill, Hill 689', sent: '1200', received: '1200', ch: [4] }),
    msg_commit: L('message', 'Radio, by relays · Cahill to Meyers', 'Committing his other two companies', Q('Q9', s('DY', 'note, p. 314')), { from: 'LtCol Cahill, 1/9', to: 'Col Meyers, 26th Marines, Khe Sanh', sent: '1320', received: '1543', ch: [4, 5, 6] }),
    msg_move1st: L('message', 'Radio · to Company C', 'Move out the 1st Platoon', Q('P1', s('HN')), { from: 'LtCol Cahill', to: 'Company C', sent: '1430', received: '1430', ch: [5] }),
    msg_status: L('message', 'Radio · Meyers to Cahill', 'Do you need help?', Q('Q10', s('DY', 'note, p. 314')), { from: 'Col Meyers, 26th Marines', to: 'LtCol Cahill, 1/9', sent: '1545', received: null, ch: [6] }),
    msg_decline: L('message', 'Radio · Cahill to Meyers', 'No help needed', P('Cahill declines the regiment\'s offer of help.', s('DY', 'p. 314 and note')), { from: 'LtCol Cahill, 1/9', to: 'Col Meyers, 26th Marines', sent: null, received: null, ch: [6] }),
    msg_ceasefire: L('message', 'Radio · Connelly to the guns', 'Cease fire', P('Lieutenant Connelly stops the artillery mission on the bunkers to Company C\'s left when its rounds fall within 50 metres.', s('DY', 'pp. 314–315')), { from: '1stLt Connelly, Company C', to: 'the artillery', sent: null, received: null, ch: [6] }),
    msg_withdraw: L('message', 'Radio · Cahill to the companies', 'Withdraw', Q('Q13', s('DY', 'p. 315')), { from: 'LtCol Cahill, at the landing zone', to: 'Companies A, C and D; Hartzell and Donnelly on Hill 689', sent: '1730', received: null, ch: [7], line2: Q('Q32', s('HN', 'about 1745, to Hartzell and Donnelly')) }),
    msg_ao: L('message', 'Radio · air observer to 1/9', 'One live Marine seen', P('An air observer over the ridge reports one live Marine at the scene.', s('ComdC', 'p. 11, at 0900') + '; HN puts the sighting at midday, called in at 1330'), { from: 'Air observer', to: '1/9 operations centre, Hill 689', sent: '0900', received: null, ch: [11] }),
    msg_army: L('message', 'Radio · Army air cavalry', 'A sighting that never arrived',
      P('One account says Army air-cavalry scouts reported the 66th Regiment back near Route 9 and Lang Vei that day, and that it never reached the Marines. No time is given, and no Marine record read mentions it.', s('HN')),
      { from: 'Army air-cavalry scouts', to: 'an Army unit on a nearby hill (never passed to the Marines)', sent: null, received: null, ch: [5] }),
  };

  // ---------- the story panel (DESIGN.md 5b): chapters that hold until Next ----------
  // { id, title, date, clock (as the scene shows it), text (two plain sentences), ref }
  window.STORY = {
    title: 'Hill 689 · 16 April 1968',
    sub: 'Capt Lawrence Himmer, Company C, 1st Battalion, 9th Marines',
    chapters: [
      { id: 1, title: 'Hill 689', date: '16 April', clock: '0600',
        text: '1/9 has held this hill for eight days, after the siege of Khe Sanh. Company A gets ready to patrol the ridge to the south-west.',
        ref: s('ComdC', 'pp. 3, 10') + '; ' + s('DY', 'p. 313') },
      { id: 2, title: 'The patrol', date: '16 April', clock: '0700–1000',
        text: 'Captain Banks leads two reinforced platoons of Company A down into the valley and up toward the grass ridge. They are approaching where Company A fought a squad three days ago.',
        ref: s('DY', 'p. 313') + ' (Q1); ' + s('ComdC', 'p. 10') + ' (Q23)' },
      { id: 3, title: 'Contact', date: '16 April', clock: '1000–1200',
        text: 'Two squads push up into grass higher than a man and hidden bunkers open fire. Lieutenant Hayden\'s platoon assaults the north end; he is killed, then his platoon sergeant.',
        ref: s('DY', 'p. 313') + ' (Q2, Q4)' },
      { id: 4, title: 'A squad, he says', date: '16 April', clock: '1030–1320',
        text: 'Banks tells Cahill he faces a squad in heavy fortifications and turns down help; at noon he asks for it. Cahill goes forward with two platoons of Charlie Company and tells the regiment at 1320 that he is committing them; the message takes until 1543 to arrive.',
        ref: s('DY', 'p. 313') + ' (Q8, Q5); note p. 314 (Q9)' },
      { id: 5, title: 'The climb', date: '16 April', clock: '1200–1435',
        text: 'Captain Himmer\'s two platoons cross the valley and climb the south slope to about fifty yards from the top. Cahill orders him to attack from the south, and at 1435 rockets hit Hill 689 behind them.',
        ref: s('DY', 'pp. 313–314') + ' (Q6); ' + s('HN') + ' (P1); ' + s('ComdC', 'p. 10') + ' (Q26, Q27)' },
      { id: 6, title: 'The attack', date: '16 April', clock: '1435–1500',
        text: 'Charlie Company advances up the ridge on line against the enemy\'s right. Fire opens from a second hidden position on their left, and within moments Himmer, both platoon commanders, a platoon sergeant and several squad leaders fall wounded.',
        ref: s('DY', 'pp. 314–315') + ' (Q7); ' + s('NC') + ' (Q19)' },
      { id: 7, title: 'Desperate straits', date: '16 April', clock: '1500–1805',
        text: 'Lieutenant Connelly takes the company; Delta attacks along the ridge and is stopped by snipers; Cahill is wounded three times walking to the landing zone. About 1730 he orders the companies to carry out their wounded and leave their dead.',
        ref: s('DY', 'p. 315') + ' (Q11, Q12, Q13); ' + s('HN') + ' (Q32)' },
      { id: 8, title: 'Dusk', date: '16 April', clock: '1900–2115',
        text: 'Corporal Hunnicutt crawls out of his crater to find help and finds his company commander lying in the open, severely wounded. He stays. At 2115 the companies begin the walk back to Hill 689.',
        ref: s('NC') + ' (Q20, Q21); ' + s('ComdC', 'p. 11') + ' (Q28)' },
      { id: 9, title: 'The night', date: '17 April', clock: '0100',
        text: 'The battalion is gone back to Hill 689, and the ridge belongs to the enemy, except for one wounded corporal beside his wounded captain. Hunnicutt is hit again helping him, and fires and throws grenades until the enemy\'s fire stops.',
        ref: s('NC') + ' (Q21 and the sentence after it); ' + s('ComdC', 'p. 11') + ' (companies back 0230–0310)' },
      { id: 10, title: 'First light', date: '17 April', clock: '0530–0630',
        text: 'At the first rays of dawn Hunnicutt moves his company commander to a covered position, then starts down the ridge toward the battalion\'s lines, bringing him. Weak from loss of blood, he falls into a gully, and the two men are parted.',
        ref: s('NC') + ' (Q22 and the sentence after it); ' + s('DY', 'p. 316') },
      { id: 11, title: 'The valley', date: '17 April', clock: '0630–1200',
        text: 'At 0630 a voice is heard across the valley from the ridge; two squads go out and shout back, and after two shots it stops. At noon two helicopters bring a squad to the hill; the first lands in the wrong place beside enemy spider holes, is hit about twenty times, and flies the thousand metres back to Hill 689 and lands hard.',
        ref: s('DY', 'p. 315') + '; ' + s('ComdC', 'pp. 11–12') },
    ],
    // the last line of the scene, after chapter 11 (Q16, Q17)
    closing: { lines: [Q('Q16', s('DY', 'p. 316')), Q('Q17', s('DY', 'p. 316'))] },
    // text only, no scene
    epilogue: [
      { date: '17 April, evening', ...P('PFC Panykaninec, hit at the edge of a crater and left for dead, is carried out by the crew of an Army helicopter, Blue Max 48.', s('DY', 'p. 315') + '; ' + s('HN')) },
      { date: '18 April', ...P('Hunnicutt is heard again at 0630. About noon an Army helicopter crew lifts him out, and Cahill learns that he had cared for Captain Himmer since the 16th.', s('DY', 'pp. 315–316') + '; ' + s('ComdC', 'p. 12')) },
      { date: '18 April', ...Q('Q15', s('DY', 'p. 316') + ', Cpl Hunnicutt') },
      { date: '22 April', ...P('The dead are recovered from the ridge, all but three.', s('DY', 'p. 316')) },
      { date: 'The count', ...Q('Q31', s('DY', 'p. 316')) },
      { date: '9 May 1968', ...P('Larry is buried at Fort Rosecrans.', 'Chula Vista city biography (sources/larry-service-history.md)') },
      { date: '31 May 1968', ...P('Jennifer is born.', 'family (DESIGN.md 5b); not in the records read') },
      { date: 'What is not known', ...P('The time and place of Larry\'s death are not in the records read.', 'research.md 2 and 13') },
    ],
  };
})();
