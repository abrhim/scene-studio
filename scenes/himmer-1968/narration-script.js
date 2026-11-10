// narration-script.js: what the narrator says, and when. Read by narration.js (the voice and the captions).
// The rule is the scene's rule (DESIGN.md 5): the record's words, named where sourced, said plainly and gently. A cue
// is spoken once per visit to its chapter; the chapter keeps looping after the voice stops. `t` is the loop second the
// line starts at; `clock` resolves to the loop second the scene's clock reads that time (ctx.clockT). `q` marks a
// quotation read verbatim (research.md 14, by id); `p` a paraphrase of the record (the panel's own words); `us` a
// line of ours that states the rule. `src` is where it comes from, for the review, not read aloud unless `say` has it.
(function () {
  const DY = 'Shulimson et al., The Defining Year, 1968 (official history)';
  const NC = "Cpl Hunnicutt's Navy Cross citation";
  const CC = '1/9 Command Chronology, April 1968';
  window.NARRATION = {
    voice: 'a low, unhurried voice; no drama; pauses at the full stops; quotations a shade slower',
    chapters: [
      { id: 1, cues: [
        { t: 2, us: 'Hill 689, west of Khe Sanh. The sixteenth of April, 1968, six in the morning.' },
        { t: 9, p: 'The 1st Battalion, 9th Marines has held this hill for eight days, since the siege was lifted. Company A is getting ready to patrol the ridge to the south-west, where it fought a squad three days ago.', src: DY + ' p. 313; ' + CC + ' pp. 3, 10' },
        { t: 24, p: 'Captain Lawrence Himmer, Larry, commands Company C.', src: DY + ' p. 313' },
        { t: 30, us: 'This is that day and the night after it, as the records tell it. Where the records are silent, so is this.' },
      ] },
      { id: 2, cues: [
        { t: 3, p: 'Seven o\'clock. Captain Banks leads two reinforced platoons of Company A down into the valley and up toward the grass ridge.', src: DY + ' p. 313 (Q1)' },
        { t: 38, say: 'The official history calls it', q: 'a nearby ridge that was covered with four-to-six-foot-high elephant grass', src: DY + ' p. 313 (Q2)' },
        { t: 70, p: 'By ten they are approaching the ground where Company A fought a squad on the thirteenth.', src: CC + ' p. 10 (Q23)' },
      ] },
      { id: 3, cues: [
        { t: 2, p: 'Ten o\'clock. Two squads push up into grass higher than a man.', src: DY + ' p. 313' },
        { t: 13, p: 'Hidden bunkers open fire.', src: DY + ' p. 313; ' + CC + ' p. 10 (Q24)' },
        { t: 28, p: 'Lieutenant Hayden\'s platoon assaults the north end.', src: DY + ' p. 313' },
        { t: 43, say: 'The history says:', q: 'In rapid succession, first Hayden and then his platoon sergeant were killed.', src: DY + ' p. 313 (Q4)' },
        { t: 62, p: 'Artillery and air cannot be used. The two sides are too close.', src: CC + ' p. 10 (Q25)' },
        { t: 96, p: 'Banks tells the battalion he faces a squad in heavily fortified positions, and turns down help.', src: DY + ' p. 313 (Q8)' },
      ] },
      { id: 4, cues: [
        { t: 2, q: 'At noon, Banks reconsidered and asked for help.', src: DY + ' p. 313 (Q5)' },
        { t: 18, p: 'Lieutenant Colonel Cahill, the battalion commander, goes forward himself, with two platoons of Charlie Company. Captain Himmer\'s company.', src: DY + ' pp. 313–314' },
        { t: 61, p: 'They move off down the slope.', src: CC + ' p. 10 (Q26, 1435, marked)' },
        { t: 82, p: 'At twenty past one, Cahill tells the regiment he is committing them. Passed from relay to relay, the message will not arrive until 1543.', src: DY + ' fn p. 314 (Q9)' },
      ] },
      { id: 5, cues: [
        { t: 3, p: 'Charlie Company crosses the valley and climbs the south slope.', src: DY + ' p. 314' },
        { t: 61, p: 'At 1435, fifteen rockets strike Hill 689 behind them.', src: CC + ' p. 10 (Q27)' },
        { t: 96, p: 'They halt about fifty yards below the top.', src: DY + ' p. 314' },
        { t: 109, q: 'He ordered Himmer to attack from the south.', src: DY + ' pp. 313–314 (Q6)' },
      ] },
      { id: 6, cues: [
        { t: 2, p: 'Charlie Company advances up the ridge on line, against the enemy\'s right.', src: DY + ' p. 314; ' + CC + ' p. 10' },
        { t: 17, p: 'Fire opens from a second hidden position on their left.', src: DY + ' p. 315' },
        { t: 25, q: 'Within moments, Himmer, both platoon commanders, a platoon sergeant, and several squad leaders fell with wounds.', src: DY + ' p. 315 (Q7)' },
        { t: 42, p: 'Lieutenant Connelly takes the company.', src: DY + ' p. 315' },
        { t: 57, p: 'Corporal Hunnicutt treats his platoon commander\'s wounds and sends his squad into a bomb crater, to wait for a lull.', src: NC + ' (Q19)' },
      ] },
      { id: 7, cues: [
        { t: 2, say: 'The history says:', q: 'At 1500, Companies A and C were both in desperate straits.', src: DY + ' p. 315 (Q11)' },
        { t: 14, p: 'Delta Company attacks along the ridge and is stopped by snipers.', src: DY + ' p. 315' },
        { t: 36, p: 'Cahill, walking to the landing zone, is wounded three times, and keeps going.', src: DY + ' p. 315' },
        { t: 69, p: 'Hunnicutt tries to leave his crater, and is hit.', src: 'HistoryNet, "Rescuing the Walking Dead" (about 5 PM)' },
        { clock: '1730', p: 'About half past five, Cahill orders his companies to carry out their wounded and withdraw, leaving their dead.', src: DY + ' p. 315 (Q13)' },
        { clock: '1745', say: 'At the landing zone:', q: 'We will get them later.', src: 'Lt Col Cahill, about 1745, HistoryNet (Q32)' },
        { t: 114, p: 'Helicopters land at 1805, and the wounded are carried in.', src: DY + ' p. 461, 484 n (type inferred)' },
      ] },
      { id: 8, cues: [
        { t: 2, us: 'Dusk.' },
        { t: 8, say: 'From Hunnicutt\'s citation:', q: 'At dusk he left the position and crawled across the fire-swept terrain to secure medical aid for himself and the other casualties trapped in the bomb crater.', src: NC + ' (Q20)' },
        { t: 48, q: 'Sergeant Hunnicutt discovered his company commander lying in an open area, severely wounded.', src: NC + ' (Q21)' },
        { t: 60, p: 'He stays.', src: DY + ' p. 316; ' + NC },
        { clock: '2115', p: 'At 2115 the companies begin the walk back to Hill 689.', src: CC + ' p. 11 (Q28)' },
      ] },
      { id: 9, cues: [
        { t: 4, p: 'One in the morning. The battalion is back on Hill 689. The ridge belongs to the enemy, except for one wounded corporal beside his wounded captain.', src: DY + ' pp. 315–316; ' + NC },
      ] },
      { id: 10, cues: [
        { t: 3, q: 'At the first rays of dawn, he managed to move the company commander to a covered position', src: NC + ' (Q22)' },
        { t: 28, p: 'Then he starts down the ridge toward the battalion\'s lines, bringing him.', src: DY + ' p. 316' },
        { t: 77, p: 'Weak from loss of blood, he falls into a gully. The two men are parted.', src: NC + '; ' + DY + ' p. 316' },
      ] },
      { id: 11, cues: [
        { t: 2, p: 'Half past six. A voice is heard across the valley.', src: DY + ' p. 315' },
        { t: 7, p: 'Two squads go out and shout back.', src: DY + ' p. 315' },
        { t: 16, p: 'After two shots, it stops.', src: DY + ' p. 315' },
        { t: 38, p: 'An observation plane circles the ridge and reports one live Marine seen.', src: CC + ' p. 11 (0900)' },
        { t: 86, p: 'At noon two helicopters bring a squad to the hill. The first lands in the wrong place, beside enemy spider holes, and is hit about twenty times.', src: CC + ' pp. 11–12; ' + DY + ' p. 315' },
        { t: 110, p: 'It flies the thousand metres back to Hill 689, and lands hard.', src: CC + ' p. 12' },
      ] },
    ],
    // the record's last line, after chapter 11's cues (the panel's "Never seen alive again")
    closing: { id: 'closing', cues: [
      { t: 0, say: 'The history says:', q: 'Hunnicutt claimed that Captain Himmer had still been alive as late as the afternoon of the 17th.', src: DY + ' p. 316 (Q16)' },
      { t: 9, q: 'Himmer was never seen alive again.', src: DY + ' p. 316 (Q17)' },
    ] },
    // text only on screen; spoken when the panel's "Afterwards" is opened
    epilogue: { id: 'epilogue', cues: [
      { t: 0, us: 'Afterwards.' },
      { t: 2, p: 'The evening of the seventeenth. PFC Panykaninec, hit at the edge of a crater and left for dead, is carried out by the crew of an Army helicopter.', src: DY + ' p. 315; HistoryNet' },
      { t: 12, p: 'The eighteenth. Hunnicutt is heard again at half past six. About noon an Army helicopter crew lifts him out, and Cahill learns that he had cared for Captain Himmer since the sixteenth.', src: DY + ' pp. 315–316; ' + CC + ' p. 12' },
      { t: 26, say: 'In Hunnicutt\'s words:', q: 'About noon I guess, an Army Huey started flying around me, a spotter plane. The spotter plane dropped two red smokes on me and scared me to death. I thought they were going to blow me away. I tried to stand up and wave to them. I threw paper all over the place and waved, and one of the copters came right down on me about three times. I could see the man\'s face, and then finally he set down and one of the machine gunners came out and helped me into the plane.', src: DY + ' p. 316 (Q15)' },
      { t: 60, p: 'The twenty-second. The dead are recovered from the ridge, all but three.', src: DY + ' p. 316' },
      { t: 68, say: 'The count:', q: 'the final casualty count totalled 38 Marines and 3 Navy corpsmen killed in action and 32 Marines wounded', src: DY + ' p. 316 (Q31)' },
      { t: 80, p: 'The ninth of May. Larry is buried at Fort Rosecrans.', src: 'Chula Vista city biography (sources/larry-service-history.md)' },
      { t: 86, p: 'The thirty-first of May. Jennifer is born.', src: 'family (DESIGN.md 5b); not in the records read' },
      { t: 92, us: 'The time and place of Larry\'s death are not in the records read.' },
    ] },
  };
})();
