/* Haddonfield Weather — dialogue. Short film-inspired lines + live weather reports. */
const HWT = (() => {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const QUOTES = {
    loomis: ["He's gone! The evil is gone!", "Death has come to your little town, Sheriff.", "I watched him for fifteen years.", "He's not a man.", "You don't know what death is!", "He's waiting for something. I know it.", "I spent fifteen years trying to reach him."],
    laurie: ["I dropped the key off at the Myers place.", "Somebody's standing out there...", "Was that the boogeyman?", "I don't have a date for the dance.", "Tommy, there's no such thing as the boogeyman.", "Annie, he's following us."],
    laurie2: ["Why won't he die?", "Jimmy? Where is everybody?", "I just want to sleep.", "He's still out there.", "My ankle... I can't run."],
    annie: ["Speak up, Lester!", "Laurie, you never have any fun.", "Paul's grounded. Halloween's ruined.", "I'm going to pick up Paul. Watch Lindsey.", "Totally getting stuck in this laundry room window."],
    lynda: ["Totally.", "See anything you like?", "Totally! Bob's coming over.", "Everyone's babysitting tonight. Totally weird."],
    bob: ["Where's the beer?", "I'll be right back.", "Lynda, did you hear something?", "Nobody's home at the Wallaces'. Perfect."],
    brackett: ["It's Halloween. Everyone's entitled to one good scare.", "Kids. Halloween. Pranks.", "Somebody broke into the hardware store.", "If you're right about this, Doc, God help us.", "Annie, get home before dark."],
    tommy: ["You can't kill the boogeyman!", "It was the boogeyman! He's outside!", "Laurie, what's the boogeyman?", "I saw him across the street!", "Can we watch The Thing again?"],
    lindsey: ["What's the boogeyman look like?", "I want to watch the monster movie!", "Is he coming here?", "Tommy says it's real."],
    marion: ["Sam, it's pouring. Slow down.", "They're out walking around... in the rain.", "The only thing he's going to do is stay locked up.", "Don't you think we should be careful?", "I'm cold. Let's just get the paperwork done."],
    jimmy: ["It's okay, Laurie. I'm here.", "I'll find Mrs. Alves.", "Hang on, we'll get you upstairs.", "Something's wrong in this hospital."],
    budd: ["Hot tub's warmed up, Karen.", "Amazing what comes in on Halloween.", "Ambulance is gassed and ready.", "Relax. Nothing ever happens on the night shift."],
    garrett: ["Phones are out. Quiet as a grave.", "I'll check the east wing.", "Night shift on Halloween. Figures.", "Who's down the hall?"],
    alves: ["Where IS everybody?", "This is a hospital, not a party.", "Somebody check the halls. Now.", "I want a full report on the Strode girl."],
    karen: ["Did you hear that?", "The water's perfect, Budd.", "Mrs. Alves is going to kill us.", "Is someone down there?"],
    ben: ["Hey! It's me, Ben Tramer!", "Laurie Strode! She thinks I'm cute.", "Nice mask, huh? Spooky.", "Off to the Halloween party!"],
  };
  const FLAVOR = {
    loomis: [["Listen to me.", "Sheriff, look at this:", "Mark my words."], ["He's out there in it.", "Lock your doors tonight.", "He's waiting for dark."]],
    laurie: [["Okay, so...", "Hmm.", "Weather check before school:"], ["I should bring a sweater.", "Annie's going to complain.", "I'll walk fast."]],
    laurie2: [["Jimmy... the window says:", "Out there:", "Listen:"], ["Don't leave me alone.", "Please hurry.", "He's coming."]],
    annie: [["Ugh.", "Seriously?", "Okay, weather report, Laurie:"], ["Totally ruins my hair.", "Paul better call.", "I'm not walking in that."]],
    lynda: [["Totally:", "Like, totally:", "Okay, so:"], ["Totally.", "Bob better drive.", "Totally gross."]],
    bob: [["Hey hey!", "Yo Lynda:", "Check it:"], ["Perfect night for a party.", "Grab a beer.", "Be right back..."]],
    brackett: [["County bulletin:", "For the record:", "Sheriff's report:"], ["Everyone stay in tonight.", "Kids, stay off Lampkin Lane.", "One good scare, that's all."]],
    tommy: [["Laurie!", "Guess what!", "Lindsey, listen:"], ["Perfect for trick-or-treat!", "The boogeyman likes that.", "Can we carve another pumpkin?"]],
    lindsey: [["Tommy says:", "Um...", "Laurie said:"], ["Can I stay up late?", "Is that scary?", "I want popcorn."]],
    marion: [["Sam,", "For the paperwork:", "From the car:"], ["Keep the wipers going.", "Close the window.", "Let's get this over with."]],
    jimmy: [["Okay, vitals... I mean, weather:", "Ambulance radio says:", "Listen:"], ["Stay warm, Laurie.", "I'll be right back.", "Hang in there."]],
    budd: [["Radio says:", "Hey Karen:", "Ha!"], ["Hot tub weather.", "Back to my coffee.", "Nothing happens around here."]],
    garrett: [["Rounds report:", "Security log:", "From the guard desk:"], ["All quiet. Too quiet.", "Phones are still dead.", "Lights keep flickering."]],
    alves: [["Charting the weather:", "Nurse, write this down:", "Status:"], ["Back to your stations.", "And where is Budd?", "No excuses."]],
    karen: [["Um, Mrs. Alves?", "Budd says:", "Okay:"], ["Hot tub, anyone?", "Was that a footstep?", "Don't tell Mrs. Alves."]],
    ben: [["Hey hey!", "Ben Tramer weather!", "Woo!"], ["Party's on!", "Nice night for a mask.", "Tell Laurie I said hi!"]],
  };
  const NARR = {
    hedge: ["The Shape is behind the hedge.", "Something moves behind the hedge.", "He's watching from the bushes."],
    tree: ["Behind the oak tree. Just for a second.", "He peeks. He waits.", "The Shape stays very still."],
    lamp: ["Under the streetlight. Then he isn't.", "The lamp flickers. He stays.", "He tilts his head. Curious."],
    approach: ["Closer.", "He doesn't run. He doesn't need to.", "Walking. Always walking."],
    window: ["Upstairs window of the Myers house.", "Someone's home at 45 Lampkin Lane.", "The house has been empty for fifteen years. Supposedly."],
    sheets: ["Between the sheets on the line.", "The wind moves the laundry. Not only the wind."],
    situp: ["He's down. He's not moving.", "Six shots. He went down."],
    corridor: ["Haddonfield Memorial. East wing.", "The lights keep failing on the east wing."],
    blind: ["He can't see. He doesn't need to.", "The hallway smells like ether."],
    cemetery: ["Judith Myers' headstone is missing.", "Someone took it. Fifteen years later."],
    glint: ["A knife in the dark.", "*heavy breathing*", "Something glints in the dark."],
    burn: ["He walks out of the fire.", "Still walking. Still burning."],
    tilt: ["He tilts his head.", "*heavy breathing*", "He's admiring his work."],
    smiths: ["Smith's Grove. October 30th.", "The patients are out walking in the rain."],
    nobody: ["There's nobody there.", "Just the hedge. Just the wind.", "Nobody there. Probably."],
    inside: ["The door opens. She makes it inside.", "Locked. For now."],
    vanish: ["You looked away. He's gone.", "Gone.", "Where did he go?"],
  };
  const LINES = {
    laurie_hedge: ["Annie... somebody's standing behind that hedge.", "There was a man... right there.", "I swear somebody was there."],
    laurie_help: ["HELP! SOMEBODY HELP ME!", "TOMMY! LINDSEY!", "PLEASE! HELP!"],
    laurie_door: ["TOMMY! OPEN THE DOOR!", "OPEN THE DOOR! PLEASE!", "Tommy, let me in!"],
    laurie2_run: ["Jimmy?! Where is everybody?!", "Somebody... anybody...", "Not here. Not again."],
    laurie2_lot: ["The car... get to the car...", "Keep going. Don't look back.", "Jimmy's car! Jimmy!"],
    loomis_gone: ["He's gone! He's gone from here! The evil is gone!", "I told them. I told them all.", "He's going home. To Haddonfield."],
    loomis_evil: ["I've come to stop him.", "He's here. I can feel it.", "Death has come to your little town, Sheriff."],
    horn: ["A car horn blares across the parking lot... and doesn't stop.", "The horn won't stop."],
  };
  const SHEET = ["See anything you like?", "Bob? Is that you? Very funny.", "Cute ghost costume. Totally."];
  const GONE = { 1: ["Six shots. He went over the edge.", "I shot him six times!", "He's down there. On the lawn."], 2: ["...He's gone.", "I knew this would happen.", "He's gone. Of course he is."] };

  let topicI = Math.floor(Math.random() * 10);
  function report(id) {
    const W = window.HW && HW.snapshot && HW.snapshot();
    if (!W) return "The radio's dead. No weather yet.";
    const T = W.u;
    const topics = [
      () => `It's ${T(W.temp)} out, feels like ${T(W.feels)}. ${W.cond}.`,
      () => `High ${T(W.hi)}, low ${T(W.lo)} today. ${W.cond}.`,
      () => `Wind's out of the ${W.dir} at ${W.wind} mph, gusts to ${W.gust}.`,
      () => `${W.pop}% chance of rain today. ${W.pop > 50 ? 'Bring an umbrella.' : 'Probably dry.'}`,
      () => W.nextHour,
      () => `Humidity ${W.hum}%. Dew point ${T(W.dew)}.`,
      () => `UV index is ${W.uv}. ${W.uv >= 6 ? 'Even the Shape needs sunscreen.' : 'Pale masks stay pale.'}`,
      () => `Tonight it drops to ${T(W.tonight)}.`,
      () => `Tomorrow: ${W.tmrCond}, ${T(W.tmrHi)} and ${T(W.tmrLo)}, ${W.tmrPop}% rain.`,
      () => `Sunset at ${W.sunset}. After that, it's his time.`,
      () => `${W.moon} tonight.`,
      () => `Pressure ${W.pressure} inches. Visibility ${W.vis} miles.`,
    ];
    if (W.alert) topics.push(() => `${W.alert} in effect!`, () => `${W.alert}. Stay inside.`);
    topicI = (topicI + 1) % topics.length;
    const f = FLAVOR[id] || [[''], ['']];
    return `${pick(f[0])} ${topics[topicI]()} ${pick(f[1])}`.trim();
  }
  return {
    quote: id => pick(QUOTES[id] || ['...']),
    report,
    narr: k => pick(NARR[k] || ['...']),
    line: k => pick(LINES[k] || ['...']),
    sheetLine: () => pick(SHEET),
    goneLine: n => pick(GONE[n]),
    QUOTES,
  };
})();
