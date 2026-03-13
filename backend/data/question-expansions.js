function appendUnique(target, extras, keyFn = (item) => JSON.stringify(item)) {
  const seen = new Set(target.map(keyFn));
  for (const item of extras) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      target.push(item);
      seen.add(key);
    }
  }
}

function stringKey(value) {
  return String(value).trim().toLowerCase();
}

function pairKey(item) {
  return `${String(item.a).trim().toLowerCase()}|${String(item.b).trim().toLowerCase()}`;
}

function promptKey(item) {
  return String(item.prompt).trim().toLowerCase();
}

function topicKey(item) {
  return String(item.topic).trim().toLowerCase();
}

function emojiKey(item) {
  return String(item.emojis).trim();
}

function triviaKey(item) {
  return String(item.q).trim().toLowerCase();
}

function spyfallKey(item) {
  return String(item.name).trim().toLowerCase();
}

function sanitizeSimpleDrawWord(word) {
  return String(word)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeDrawEntries(entries) {
  return entries
    .map((entry) => ({
      ...entry,
      word: sanitizeSimpleDrawWord(entry.word),
    }))
    .filter((entry) => entry.word.length > 0);
}

function drawKey(entry) {
  return stringKey(entry.word);
}

function makeTriviaQuestion(q, correct, wrongAnswers, cat) {
  return {
    q,
    options: [correct, ...wrongAnswers.slice(0, 3)],
    correct: 0,
    cat,
  };
}

function numericOptions(correct, spacing) {
  return [
    String(correct + spacing),
    String(correct - spacing),
    String(correct + spacing * 2),
  ];
}

function generateMathTrivia() {
  const questions = [];

  for (let index = 0; index < 40; index++) {
    const a = 12 + index;
    const b = 7 + (index % 9);
    const correct = a + b;
    questions.push(makeTriviaQuestion(
      `What is ${a} + ${b}?`,
      String(correct),
      numericOptions(correct, 2),
      "math"
    ));
  }

  for (let index = 0; index < 40; index++) {
    const a = 60 + index * 2;
    const b = 6 + (index % 11);
    const correct = a - b;
    questions.push(makeTriviaQuestion(
      `What is ${a} - ${b}?`,
      String(correct),
      numericOptions(correct, 3),
      "math"
    ));
  }

  for (let index = 0; index < 40; index++) {
    const a = 3 + (index % 10);
    const b = 4 + Math.floor(index / 10);
    const correct = a * b;
    questions.push(makeTriviaQuestion(
      `What is ${a} x ${b}?`,
      String(correct),
      numericOptions(correct, a),
      "math"
    ));
  }

  for (let index = 0; index < 40; index++) {
    const divisor = 2 + (index % 8);
    const quotient = 5 + Math.floor(index / 4);
    const dividend = divisor * quotient;
    questions.push(makeTriviaQuestion(
      `What is ${dividend} divided by ${divisor}?`,
      String(quotient),
      numericOptions(quotient, 2),
      "math"
    ));
  }

  for (let base = 5; base < 25; base++) {
    const correct = base * base;
    questions.push(makeTriviaQuestion(
      `What is ${base} squared?`,
      String(correct),
      numericOptions(correct, base),
      "math"
    ));
  }

  const percentageCases = [
    [10, 50], [10, 70], [10, 90], [15, 80], [15, 120], [20, 45], [20, 75], [20, 150],
    [25, 40], [25, 60], [25, 200], [30, 50], [30, 90], [30, 120], [40, 80], [40, 150],
    [50, 36], [50, 64], [60, 50], [60, 80], [70, 90], [75, 40], [75, 80], [80, 25],
    [80, 40], [90, 30], [5, 200], [5, 80], [12, 50], [12, 25], [35, 40], [35, 60],
    [45, 20], [45, 40], [65, 20], [65, 60], [85, 20], [85, 40], [95, 20], [95, 40],
  ];
  for (const [percent, whole] of percentageCases) {
    const correct = (percent * whole) / 100;
    questions.push(makeTriviaQuestion(
      `What is ${percent}% of ${whole}?`,
      String(correct),
      numericOptions(correct, Math.max(2, Math.round(percent / 10))),
      "math"
    ));
  }

  const timeCases = [
    [2, "hours", "minutes", 120], [3, "hours", "minutes", 180], [4, "hours", "minutes", 240],
    [5, "hours", "minutes", 300], [6, "hours", "minutes", 360], [7, "hours", "minutes", 420],
    [8, "hours", "minutes", 480], [9, "hours", "minutes", 540], [10, "hours", "minutes", 600],
    [12, "hours", "minutes", 720], [90, "minutes", "hours", 1.5], [120, "minutes", "hours", 2],
    [150, "minutes", "hours", 2.5], [180, "minutes", "hours", 3], [210, "minutes", "hours", 3.5],
    [240, "minutes", "hours", 4], [300, "minutes", "hours", 5], [360, "minutes", "hours", 6],
    [45, "seconds", "milliseconds", 45000], [30, "seconds", "milliseconds", 30000],
    [2, "days", "hours", 48], [3, "days", "hours", 72], [4, "days", "hours", 96],
    [5, "days", "hours", 120], [7, "days", "hours", 168], [14, "days", "hours", 336],
    [2, "weeks", "days", 14], [3, "weeks", "days", 21], [4, "weeks", "days", 28],
    [12, "months", "years", 1], [24, "months", "years", 2], [36, "months", "years", 3],
    [48, "hours", "days", 2], [72, "hours", "days", 3], [96, "hours", "days", 4],
    [1000, "milliseconds", "second", 1], [2000, "milliseconds", "seconds", 2],
    [5000, "milliseconds", "seconds", 5], [15000, "milliseconds", "seconds", 15], [600, "seconds", "minutes", 10],
  ];
  for (const [value, fromUnit, toUnit, correct] of timeCases) {
    questions.push(makeTriviaQuestion(
      `How many ${toUnit} are in ${value} ${fromUnit}?`,
      String(correct),
      [String(correct + 1), String(correct + 2), String(correct + 3)],
      "math"
    ));
  }

  const polygonSides = [
    ["triangle", 3], ["square", 4], ["pentagon", 5], ["hexagon", 6], ["heptagon", 7],
    ["octagon", 8], ["nonagon", 9], ["decagon", 10], ["hendecagon", 11], ["dodecagon", 12],
    ["tridecagon", 13], ["tetradecagon", 14], ["pentadecagon", 15], ["icosagon", 20],
    ["quadrilateral", 4], ["septagon", 7], ["enneagon", 9], ["duodecagon", 12], ["hexadecagon", 16], ["octadecagon", 18],
  ];
  for (const [name, sides] of polygonSides) {
    questions.push(makeTriviaQuestion(
      `How many sides does a ${name} have?`,
      String(sides),
      numericOptions(sides, 1),
      "math"
    ));
  }

  return questions;
}

function applyQuestionExpansions(pools) {
  const {
    GUESS_THE_LIAR,
    TWO_TRUTHS_TOPICS,
    MOST_LIKELY_TO,
    NEVER_HAVE_I_EVER,
    WOULD_YOU_RATHER,
    HOT_TAKES,
    ROAST_ROOM,
    RED_FLAG_RADAR,
    VIBE_CHECK_CATEGORIES,
    DEBATE_PIT_TOPICS,
    WORD_ASSOCIATION,
    EMOJI_STORIES,
    FINISH_THE_SENTENCE,
    THIS_OR_THAT,
    UNHINGED_ADVICE,
    CONFESSIONS_PROMPTS,
    SPEED_ROUND,
    PICK_YOUR_POISON,
    BURN_OR_BUILD,
    RATE_THAT_TAKE,
    SUPERLATIVES,
    WHOSE_LINE_PROMPTS,
    TRIVIA_BLITZ,
    DRAW_IT_WORDS,
    WORD_BOMB_PATTERNS,
    BINGO_ITEMS,
    SPYFALL_LOCATIONS,
  } = pools;

  appendUnique(GUESS_THE_LIAR, [
    "What is the worst excuse you have used to cancel plans?",
    "What would you do first if you woke up invisible?",
    "What is your most useless skill?",
    "What is the weirdest thing you believed as a kid?",
    "What is your go to comfort food?",
    "What would instantly improve a bad day for you?",
    "What is a tiny thing that annoys you too much?",
    "What is your most chaotic travel story?",
    "What would your villain nickname be?",
    "What is your most embarrassing school memory?",
    "What would you do with one free day and unlimited money?",
    "What is your most irrational fear?",
    "What would your signature party trick be?",
    "What is the worst fashion trend you actually tried?",
    "What is something you pretend to understand?",
    "What is the dumbest reason you have laughed too hard?",
    "What is a lie you tell yourself every week?",
    "What would your reality show be called?",
    "What is your most questionable food combo?",
    "What would you rename yourself if you had to start over?",
  ], stringKey);

  appendUnique(TWO_TRUTHS_TOPICS, [
    "weird family traditions",
    "school disasters",
    "bad fashion eras",
    "first job stories",
    "holiday chaos",
    "food regrets",
    "travel mistakes",
    "childhood obsessions",
    "celebrity encounters",
    "roommate drama",
    "terrible date stories",
    "sports fails",
    "karaoke moments",
    "pet stories",
    "tech disasters",
    "party accidents",
    "strange hobbies",
    "wedding stories",
    "airport problems",
    "bucket list dreams",
  ], stringKey);

  appendUnique(MOST_LIKELY_TO, [
    "Who is most likely to buy something expensive and then hide the receipt?",
    "Who is most likely to turn one quick errand into a full day adventure?",
    "Who is most likely to start redecorating at midnight?",
    "Who is most likely to survive on snacks instead of meals for a week?",
    "Who is most likely to become weirdly competitive over a board game?",
    "Who is most likely to send a risky text and instantly regret it?",
    "Who is most likely to accidentally join the wrong group chat?",
    "Who is most likely to become an influencer for a very niche hobby?",
    "Who is most likely to forget why they entered a room five times a day?",
    "Who is most likely to become best friends with a cashier?",
    "Who is most likely to order dessert before deciding on dinner?",
    "Who is most likely to miss a flight by doing something avoidable?",
    "Who is most likely to become obsessed with a hobby for exactly two weeks?",
    "Who is most likely to keep 47 tabs open and call it organized?",
    "Who is most likely to get emotionally attached to a random object?",
    "Who is most likely to say they are not tired and pass out immediately?",
    "Who is most likely to cry at a wholesome internet video?",
    "Who is most likely to turn a small problem into a dramatic monologue?",
    "Who is most likely to get caught dancing when they think nobody is watching?",
    "Who is most likely to bring a notebook to a completely casual hangout?",
  ], stringKey);

  appendUnique(NEVER_HAVE_I_EVER, [
    "Never have I ever set multiple alarms and still overslept",
    "Never have I ever pretended to know a song I had never heard",
    "Never have I ever opened the fridge and forgotten why",
    "Never have I ever panicked after sending an email with a typo",
    "Never have I ever watched a tutorial and still messed it up",
    "Never have I ever bought groceries while hungry and regretted it",
    "Never have I ever said yes to plans and hoped they got canceled",
    "Never have I ever accidentally liked an old post while stalking",
    "Never have I ever taken the longest possible route to avoid someone",
    "Never have I ever laughed at a joke I did not understand",
    "Never have I ever refreshed tracking for a package more than ten times",
    "Never have I ever told myself one episode and watched six",
    "Never have I ever practiced an argument in the shower",
    "Never have I ever forgotten my own phone number for a second",
    "Never have I ever worn headphones with no music to avoid conversation",
    "Never have I ever lied about reading the terms and conditions",
    "Never have I ever bought something because the packaging looked good",
    "Never have I ever faked confidence and somehow pulled it off",
    "Never have I ever started cleaning to avoid doing real work",
    "Never have I ever sent a message and immediately put my phone face down",
  ], stringKey);

  appendUnique(WOULD_YOU_RATHER, [
    { a: "Always have to sing your texts out loud", b: "Always have to whisper your phone calls" },
    { a: "Lose your charger every week", b: "Lose one sock from every pair" },
    { a: "Only travel by train", b: "Only travel by boat" },
    { a: "Live in a giant city forever", b: "Live in a tiny town forever" },
    { a: "Have free food for life", b: "Have free flights for life" },
    { a: "Be too hot forever", b: "Be too cold forever" },
    { a: "Always know the time", b: "Always know the weather" },
    { a: "Have a rewind button", b: "Have a pause button" },
    { a: "Be famous online", b: "Be respected offline" },
    { a: "Give up coffee", b: "Give up dessert" },
    { a: "Always be 20 minutes early", b: "Always be 20 minutes late" },
    { a: "Have your dream home", b: "Have your dream job" },
    { a: "Be great at every sport", b: "Be great at every instrument" },
    { a: "Only watch old movies", b: "Only watch new movies" },
    { a: "Eat breakfast for every meal", b: "Eat dinner for every meal" },
    { a: "Have perfect memory", b: "Have perfect luck" },
  ], pairKey);

  appendUnique(HOT_TAKES, [
    "Brunch is mostly just breakfast with better marketing",
    "Group chats should expire after 30 days of silence",
    "Most people do not actually want honesty, they want support",
    "Friday is better in theory than in practice",
    "The best seat in a car is not shotgun, it is behind the passenger seat",
    "Half of adulting is just remembering passwords",
    "Most productivity advice is just common sense with branding",
    "Some songs are only good because of nostalgia",
    "People who love hiking are really just chasing better photos",
    "A good nap can fix almost anything",
    "Self checkout is either a blessing or unpaid labor with no middle ground",
    "The best snack is the one you were not supposed to have",
    "Reply all should require a short quiz before it works",
    "Every friend group has one person who could accidentally start a cult",
    "Cheap sunglasses are more fun than expensive sunglasses",
    "Sometimes the pregame is better than the event itself",
    "The person who says they are low maintenance never is",
    "A little delusion is healthy",
    "People who say they hate drama usually bring it",
    "Nothing tests a friendship like choosing where to eat",
  ], stringKey);

  appendUnique(ROAST_ROOM, [
    "Roast a person who says they are on the way while still in bed",
    "Roast someone whose whole personality is one TV show",
    "Roast a friend who always starts stories with too much backstory",
    "Roast the person who treats every small cold like a major illness",
    "Roast someone who has to film every meal before eating it",
    "Roast a person who says sorry before saying anything normal",
    "Roast the friend who sends ten voice notes instead of one text",
    "Roast someone who keeps returning to the same toxic ex",
    "Roast a person who says trust me right before disaster happens",
    "Roast the friend who turns every chat into a therapy session",
    "Roast someone who owns way too many water bottles",
    "Roast a person who always volunteers everyone else",
  ], stringKey);

  appendUnique(RED_FLAG_RADAR, [
    "A person who says they are brutally honest and seem excited about it",
    "A person who still talks about every high school victory like it happened yesterday",
    "A person who asks for your location before your last name",
    "A person who never tips but always complains about service",
    "A person who calls all of their exes crazy with zero self reflection",
    "A person who says they are chill but monitors every detail",
    "A person who tests you instead of talking directly",
    "A person who starts filming the second any drama begins",
    "A person who keeps score in friendships",
    "A person who cannot enjoy anything unless it is exclusive",
    "A person who shares private messages for entertainment",
    "A person who says I am just built different in every argument",
  ], stringKey);

  appendUnique(VIBE_CHECK_CATEGORIES, [
    { prompt: "If you were a board game, what would you be?", hint: "short answer" },
    { prompt: "If you were a snack aisle item, what would you be?", hint: "emoji or word" },
    { prompt: "If you were a holiday, which one would you be?", hint: "short answer" },
    { prompt: "If you were a piece of clothing, what would you be?", hint: "emoji or word" },
    { prompt: "If you were a class in school, what would you be?", hint: "short answer" },
    { prompt: "If you were a weekend activity, what would you be?", hint: "emoji or phrase" },
    { prompt: "If you were a smell, what would you be?", hint: "short answer" },
    { prompt: "If you were a street food, what would you be?", hint: "emoji or word" },
    { prompt: "If you were a browser tab, what would you be?", hint: "short answer" },
    { prompt: "If you were a phone app, what would you be?", hint: "emoji or name" },
  ], promptKey);

  appendUnique(DEBATE_PIT_TOPICS, [
    { topic: "Socks in bed", for: "Wearing socks to bed is elite behavior", against: "Socks in bed is deeply wrong" },
    { topic: "Rainy day plans", for: "Staying inside is the perfect rainy day move", against: "Rainy days should still be spent outside" },
    { topic: "Manual vs automatic", for: "Manual cars are more fun and worth the effort", against: "Automatic cars are better in every practical way" },
    { topic: "Podcasts vs playlists", for: "Podcasts are better company than music", against: "Playlists beat podcasts every single time" },
    { topic: "Rewatching shows", for: "Rewatching a favorite show is better than starting something new", against: "Watching new things is always the better choice" },
    { topic: "Summer vs winter fashion", for: "Summer outfits are unbeatable", against: "Winter outfits are peak style" },
    { topic: "Camping vs hotels", for: "Camping is the better getaway", against: "Hotels beat camping every time" },
    { topic: "Physical books vs ebooks", for: "Physical books are the only real reading experience", against: "Ebooks are more practical and better" },
    { topic: "Leftovers", for: "Leftovers are often better than the first meal", against: "Fresh food is always superior" },
    { topic: "Birthday attention", for: "Birthdays should be a huge event", against: "Small quiet birthdays are far better" },
  ], topicKey);

  appendUnique(WORD_ASSOCIATION, [
    "BALLOON", "SHADOW", "GARLIC", "LASER", "POPCORN", "FOREST", "MIRROR", "CASTLE", "ANCHOR", "LANTERN",
    "BUBBLE", "METEOR", "PIRATE", "BISCUIT", "SPIDER", "PARADE", "WIZARD", "JACKET", "WHISTLE", "PLANET",
  ], stringKey);

  appendUnique(EMOJI_STORIES, [
    { emojis: "🎂 🕯️ 🐒 🎁 🚪", hint: "Tell the story these emojis describe" },
    { emojis: "🚿 🎤 😎 🧼 🫢", hint: "Tell the story these emojis describe" },
    { emojis: "🧳 🛫 🌧️ 😵 🏨", hint: "Tell the story these emojis describe" },
    { emojis: "🍔 🏃 🐕 😤 🌭", hint: "Tell the story these emojis describe" },
    { emojis: "📚 😴 ✏️ ☕ 😬", hint: "Tell the story these emojis describe" },
    { emojis: "🎮 ⚡ 😱 🪫 🙃", hint: "Tell the story these emojis describe" },
    { emojis: "🪴 🐈 📦 💥 😶", hint: "Tell the story these emojis describe" },
    { emojis: "🚪 🧍 🎈 🎉 😳", hint: "Tell the story these emojis describe" },
    { emojis: "🍟 🕊️ 😠 🏃 🌳", hint: "Tell the story these emojis describe" },
    { emojis: "🧊 🥤 🤧 📸 😂", hint: "Tell the story these emojis describe" },
  ], emojiKey);

  appendUnique(FINISH_THE_SENTENCE, [
    "If I had to fake being an expert at something it would be...",
    "The pettiest reason I have ever been annoyed is...",
    "The weirdest compliment I would love to receive is...",
    "My final straw is usually when someone...",
    "The fastest way to make me suspicious is...",
    "I knew the day was doomed when...",
    "If my phone could expose me it would mention...",
    "My most unrealistic life goal is...",
    "The one chore I act dramatic about every time is...",
    "If I got rich tomorrow the first bad purchase would be...",
  ], stringKey);

  appendUnique(THIS_OR_THAT, [
    { a: "Road trip 🚗", b: "Flight ✈️" },
    { a: "Sunrise 🌅", b: "Sunset 🌇" },
    { a: "Paper books 📚", b: "Audiobooks 🎧" },
    { a: "Concert crowd 🎵", b: "House party 🏠" },
    { a: "Rain sounds 🌧️", b: "Ocean sounds 🌊" },
    { a: "Big breakfast 🍳", b: "Big dinner 🍝" },
    { a: "Window seat 🪟", b: "Aisle seat 🚶" },
    { a: "Spend it now 💸", b: "Save it for later 🐷" },
    { a: "Chaos weekend 🎢", b: "Quiet weekend 🛋️" },
    { a: "Vintage style 📼", b: "Modern style ✨" },
  ], pairKey);

  appendUnique(UNHINGED_ADVICE, [
    "You accidentally wave back at someone who was not waving at you. Commit or escape?",
    "Your phone autocorrects a serious message into complete nonsense. How do you save it?",
    "You confidently walk into the wrong meeting and everyone expects you to lead it. What now?",
    "You told one harmless lie and now it needs a full backstory. Build it.",
    "A child asks you a difficult question in public and all adults turn to you. What do you say?",
    "You accidentally start a rumor about yourself. How do you upgrade it?",
    "You are asked to give a toast for people you barely know. How do you survive?",
    "You agree to help move house and realize there is no elevator. What is your strategy?",
    "You are on mute for the whole meeting until the one dramatic sentence. Recover.",
    "You send a screenshot to the person in the screenshot. Sell the moment.",
  ], stringKey);

  appendUnique(CONFESSIONS_PROMPTS, [
    "Confess a purchase you defended even though it was a bad idea",
    "Confess a harmless habit that would sound weird out loud",
    "Confess the pettiest thing that still annoys you",
    "Confess a skill you exaggerate having",
    "Confess a text you drafted but never sent",
    "Confess something you only do when nobody is home",
    "Confess a trend you secretly enjoy",
    "Confess a time you pretended to remember someone",
    "Confess the excuse you use most often to get out of things",
    "Confess a movie opinion that would get you booed",
  ], stringKey);

  appendUnique(SPEED_ROUND, [
    "I have pretended I did not see a message so I could answer later",
    "I have made a whole shopping trip for one item and forgot the item",
    "I have rehearsed a phone call before making it",
    "I have checked my own profile to see how it looks",
    "I have eaten dessert before dinner on purpose",
    "I have opened a streaming app without knowing what I wanted to watch",
    "I have changed outfits more than once before a casual plan",
    "I have searched for the menu before agreeing to eat somewhere",
    "I have pretended to be asleep to avoid doing something",
    "I have refreshed a score or result way too many times",
  ], stringKey);

  appendUnique(PICK_YOUR_POISON, [
    { a: "Every time you enter a room, theme music plays", b: "Every time you leave a room, a sad trombone plays" },
    { a: "Only be able to drink lukewarm water", b: "Only be able to eat slightly stale bread" },
    { a: "Have your laugh change every month", b: "Have your walking style change every month" },
    { a: "Your browser always opens 30 tabs at once", b: "Your phone always starts at 2% battery" },
    { a: "Be followed by one goose forever", b: "Be followed by one raccoon forever" },
    { a: "Every chair squeaks when you sit down", b: "Every door sticks when you touch it" },
    { a: "Only wear damp socks", b: "Only use slightly sticky keyboards" },
    { a: "Every photo of you is blurry", b: "Every video of you freezes on a bad frame" },
    { a: "Only be able to clap off beat", b: "Only be able to dance off beat" },
    { a: "Have a permanent sunburn line", b: "Have permanent hat hair" },
  ], pairKey);

  appendUnique(BURN_OR_BUILD, [
    "Read receipts",
    "Open office birthday singing",
    "QR code menus",
    "Work group chats after hours",
    "Air fryer hype",
    "Standing desks",
    "Endless streaming subscriptions",
    "Notifications for everything",
    "Audio messages longer than one minute",
    "The phrase we should catch up soon",
  ], stringKey);

  appendUnique(RATE_THAT_TAKE, [
    "If a recipe has more than ten ingredients, takeout starts winning",
    "The best part of any trip is the planning fantasy before it happens",
    "People look cooler carrying tote bags than backpacks",
    "A clean kitchen is more impressive than a clean living room",
    "Being early is secretly a power move",
    "Some friendships are mostly memes and that is enough",
    "The best fries are never the fancy ones",
    "Most people use maybe ten percent of the clothes they own",
    "A good playlist can change how an entire memory feels",
    "The right lighting can fix a shocking number of problems",
  ], stringKey);

  appendUnique(SUPERLATIVES, [
    "Most likely to accidentally plan two things for the same time slot",
    "Most likely to become suspiciously good at a random niche hobby",
    "Most likely to own the most tabs open right now",
    "Most likely to text I am outside while still getting ready",
    "Most likely to create a spreadsheet for something unserious",
    "Most likely to say one drink and fully lie about it",
    "Most likely to become best friends with a stranger on holiday",
    "Most likely to panic buy snacks for a thirty minute drive",
    "Most likely to adopt a dramatic new personality after one documentary",
    "Most likely to keep a souvenir that makes zero sense",
  ], stringKey);

  appendUnique(WHOSE_LINE_PROMPTS, [
    "Write the text you would send after a truly terrible first date",
    "Write a dramatic line for when you enter a room late",
    "Write a suspiciously specific excuse for not replying",
    "Write a fake inspirational quote that sounds real",
    "Write the sentence your enemy would hate hearing",
    "Write a one line review of adulthood",
    "Write the caption under your accidental mugshot",
    "Write the opening line of a very bad self help book",
    "Write what your future robot assistant would complain about",
    "Write the sentence that gets you kicked out of a fancy event",
  ], stringKey);

  const manualTrivia = [
    makeTriviaQuestion("Which planet is known for its rings?", "Saturn", ["Mars", "Venus", "Mercury"], "science"),
    makeTriviaQuestion("What color do you get by mixing blue and yellow?", "Green", ["Purple", "Orange", "Red"], "art"),
    makeTriviaQuestion("How many days are in a leap year?", "366", ["364", "365", "367"], "general"),
    makeTriviaQuestion("Which animal is known as the king of the jungle?", "Lion", ["Tiger", "Elephant", "Wolf"], "nature"),
    makeTriviaQuestion("What is the capital of Canada?", "Ottawa", ["Toronto", "Vancouver", "Montreal"], "geo"),
    makeTriviaQuestion("Which continent is Egypt in?", "Africa", ["Asia", "Europe", "South America"], "geo"),
    makeTriviaQuestion("Which instrument has black and white keys?", "Piano", ["Violin", "Drum", "Trumpet"], "music"),
    makeTriviaQuestion("How many letters are in the English alphabet?", "26", ["24", "25", "27"], "general"),
    makeTriviaQuestion("What is the freezing point of water in Celsius?", "0", ["10", "32", "100"], "science"),
    makeTriviaQuestion("Which country is famous for sushi?", "Japan", ["Italy", "Mexico", "Brazil"], "food"),
    makeTriviaQuestion("What is the capital of Brazil?", "Brasilia", ["Rio de Janeiro", "Sao Paulo", "Salvador"], "geo"),
    makeTriviaQuestion("What is the main language spoken in Brazil?", "Portuguese", ["Spanish", "English", "French"], "culture"),
    makeTriviaQuestion("Which planet is the biggest in our solar system?", "Jupiter", ["Saturn", "Earth", "Mars"], "science"),
    makeTriviaQuestion("Which ocean is between Africa and Australia?", "Indian", ["Atlantic", "Arctic", "Pacific"], "geo"),
    makeTriviaQuestion("What is the capital of Spain?", "Madrid", ["Barcelona", "Valencia", "Seville"], "geo"),
    makeTriviaQuestion("Which sport uses a bat, ball, and wickets?", "Cricket", ["Baseball", "Tennis", "Rugby"], "sport"),
    makeTriviaQuestion("What is the opposite of north on a compass?", "South", ["East", "West", "Up"], "general"),
    makeTriviaQuestion("Which country is shaped like a boot?", "Italy", ["Greece", "Portugal", "Croatia"], "geo"),
    makeTriviaQuestion("What gas do plants absorb from the air?", "Carbon dioxide", ["Oxygen", "Nitrogen", "Helium"], "science"),
    makeTriviaQuestion("Which board game uses black and white pieces on a checkered board?", "Chess", ["Monopoly", "Scrabble", "Cluedo"], "games"),
    makeTriviaQuestion("Which animal can sleep standing up?", "Horse", ["Panda", "Dolphin", "Penguin"], "nature"),
    makeTriviaQuestion("What is the capital of New Zealand?", "Wellington", ["Auckland", "Christchurch", "Hamilton"], "geo"),
    makeTriviaQuestion("Which planet is closest to Earth in size?", "Venus", ["Mars", "Mercury", "Saturn"], "science"),
    makeTriviaQuestion("What do bees make?", "Honey", ["Wax paper", "Milk", "Silk"], "nature"),
    makeTriviaQuestion("What is the capital of South Korea?", "Seoul", ["Busan", "Incheon", "Daegu"], "geo"),
    makeTriviaQuestion("Which fruit is known for having seeds on the outside?", "Strawberry", ["Banana", "Orange", "Pear"], "food"),
    makeTriviaQuestion("How many colors are on a standard traffic light?", "3", ["2", "4", "5"], "general"),
    makeTriviaQuestion("Which season comes after spring?", "Summer", ["Winter", "Autumn", "Monsoon"], "general"),
    makeTriviaQuestion("What is the capital of Argentina?", "Buenos Aires", ["Cordoba", "Rosario", "Mendoza"], "geo"),
    makeTriviaQuestion("Which animal is famous for carrying its home on its back?", "Snail", ["Crab", "Frog", "Turtle"], "nature"),
    makeTriviaQuestion("What is the capital of Ireland?", "Dublin", ["Cork", "Galway", "Limerick"], "geo"),
    makeTriviaQuestion("What is 1000 grams called?", "1 kilogram", ["10 kilograms", "100 kilograms", "1 liter"], "science"),
    makeTriviaQuestion("Which country is home to the city of Cairo?", "Egypt", ["Jordan", "Morocco", "Turkey"], "geo"),
    makeTriviaQuestion("What is the largest planet in the solar system?", "Jupiter", ["Saturn", "Neptune", "Earth"], "science"),
    makeTriviaQuestion("Which bird is often associated with peace?", "Dove", ["Crow", "Eagle", "Parrot"], "nature"),
    makeTriviaQuestion("Which country invented tacos?", "Mexico", ["Spain", "Argentina", "Peru"], "food"),
    makeTriviaQuestion("What is the capital of Norway?", "Oslo", ["Bergen", "Trondheim", "Stavanger"], "geo"),
    makeTriviaQuestion("How many legs does a spider have?", "8", ["6", "10", "12"], "nature"),
    makeTriviaQuestion("Which month comes after September?", "October", ["August", "November", "December"], "general"),
    makeTriviaQuestion("Which country is famous for maple syrup?", "Canada", ["USA", "Sweden", "Finland"], "food"),
  ];
  appendUnique(TRIVIA_BLITZ, manualTrivia, triviaKey);
  appendUnique(TRIVIA_BLITZ, generateMathTrivia(), triviaKey);

  const sanitizedDrawWords = sanitizeDrawEntries(DRAW_IT_WORDS);
  DRAW_IT_WORDS.length = 0;
  appendUnique(DRAW_IT_WORDS, sanitizedDrawWords, drawKey);
  appendUnique(DRAW_IT_WORDS, sanitizeDrawEntries([
    { word: "robot", diff: 1 }, { word: "helmet", diff: 1 }, { word: "ladder", diff: 1 }, { word: "pencil", diff: 1 },
    { word: "cookie", diff: 1 }, { word: "rocket ship", diff: 1 }, { word: "backpack", diff: 1 }, { word: "zebra", diff: 1 },
    { word: "panda", diff: 1 }, { word: "island", diff: 1 }, { word: "bed", diff: 1 }, { word: "crown", diff: 1 },
    { word: "drum", diff: 1 }, { word: "camera", diff: 1 }, { word: "rocket", diff: 1 }, { word: "beach ball", diff: 1 },
    { word: "pillow", diff: 1 }, { word: "cookie jar", diff: 1 }, { word: "notebook", diff: 1 }, { word: "toothbrush", diff: 1 },
    { word: "watering can", diff: 1 }, { word: "mailbox", diff: 1 }, { word: "tractor", diff: 1 }, { word: "ladybug", diff: 1 },
    { word: "vacuum", diff: 1 }, { word: "frisbee", diff: 1 }, { word: "teapot", diff: 1 }, { word: "sandwich", diff: 1 },
    { word: "rocket boots", diff: 2 }, { word: "tree house", diff: 2 }, { word: "ice castle", diff: 2 }, { word: "treasure map", diff: 2 },
    { word: "magic carpet", diff: 2 }, { word: "drum solo", diff: 2 }, { word: "snow globe", diff: 2 }, { word: "safari jeep", diff: 2 },
    { word: "robot dance", diff: 2 }, { word: "skate park", diff: 2 }, { word: "camping tent", diff: 2 }, { word: "surfboard", diff: 2 },
    { word: "pirate flag", diff: 2 }, { word: "treetop", diff: 2 }, { word: "dragon egg", diff: 2 }, { word: "moon landing", diff: 2 },
    { word: "haunted attic", diff: 2 }, { word: "space helmet", diff: 2 }, { word: "giant sandwich", diff: 2 }, { word: "desert road", diff: 2 },
    { word: "game night", diff: 3 }, { word: "brain freeze", diff: 3 }, { word: "bad luck", diff: 3 }, { word: "late again", diff: 3 },
    { word: "quiet quitting", diff: 3 }, { word: "fake smile", diff: 3 }, { word: "office gossip", diff: 3 }, { word: "party animal", diff: 3 },
    { word: "home sick", diff: 3 }, { word: "awkward silence", diff: 3 }, { word: "double life", diff: 3 }, { word: "memory lane", diff: 3 },
    { word: "group project", diff: 3 }, { word: "weekend mode", diff: 3 }, { word: "food coma", diff: 3 }, { word: "deep thought", diff: 3 },
    { word: "bad timing", diff: 3 }, { word: "overthinking", diff: 3 }, { word: "good vibes", diff: 3 }, { word: "brainstorm", diff: 3 },
  ]), drawKey);

  appendUnique(WORD_BOMB_PATTERNS, [
    "AIR", "ASH", "ASK", "BAN", "BAR", "BEE", "BIT", "BOX", "CAN", "CAP",
    "CAR", "DAY", "DOG", "ELF", "FAN", "FAR", "GEM", "GLA", "HAT", "ICE",
    "ILL", "JOY", "KEY", "LIP", "MAN", "MAP", "NET", "NOD", "ORB", "PAN",
    "PEA", "RAT", "RIM", "SEA", "SON", "SUN", "TAR", "TOP", "VAN", "ZIP",
  ], stringKey);

  appendUnique(BINGO_ITEMS, [
    "Someone says I am just saying",
    "A dramatic gasp happens",
    "Someone checks the weather for no reason",
    "A snack gets defended too aggressively",
    "Someone says hear me out",
    "One person gets roasted by the whole room",
    "Someone says that is so me",
    "A story starts with this is a long story",
    "Someone admits they were wrong and hates it",
    "A random object becomes the center of debate",
    "Someone asks what day it is",
    "A plan gets made and instantly questioned",
    "Someone says honestly and then says something wild",
    "Someone mentions a dream they had",
    "An old photo gets brought up",
    "Someone forgets a simple word mid sentence",
    "A food order becomes way too detailed",
    "Someone says wait what are we talking about",
    "A terrible impression is attempted",
    "Someone says that is actually insane",
  ], stringKey);

  appendUnique(SPYFALL_LOCATIONS, [
    { name: "Aquarium", roles: ["Marine Biologist", "Tourist", "Gift Shop Clerk", "Diver", "Penguin Keeper", "Janitor"] },
    { name: "Arcade", roles: ["High Score Chaser", "Ticket Counter Clerk", "Birthday Kid", "Machine Technician", "Gamer", "Prize Winner"] },
    { name: "Bakery", roles: ["Head Baker", "Cashier", "Customer", "Cake Decorator", "Delivery Driver", "Apprentice"] },
    { name: "Camping Ground", roles: ["Park Ranger", "Camper", "Tent Builder", "Lost Hiker", "Firewood Seller", "Fishing Guide"] },
    { name: "Courtroom", roles: ["Judge", "Lawyer", "Witness", "Bailiff", "Journalist", "Defendant"] },
    { name: "Fashion Show", roles: ["Model", "Designer", "Photographer", "Makeup Artist", "Stylist", "VIP Guest"] },
    { name: "Fire Station", roles: ["Firefighter", "Dispatcher", "Captain", "Paramedic", "Mechanic", "Visitor"] },
    { name: "Gym", roles: ["Trainer", "Member", "Receptionist", "Spin Instructor", "Cleaner", "Bodybuilder"] },
    { name: "Hotel", roles: ["Bellhop", "Guest", "Manager", "Housekeeper", "Chef", "Concierge"] },
    { name: "Laboratory", roles: ["Scientist", "Intern", "Test Subject", "Lab Manager", "Safety Officer", "Research Assistant"] },
    { name: "Newsroom", roles: ["Anchor", "Producer", "Reporter", "Camera Operator", "Editor", "Intern"] },
    { name: "Restaurant Kitchen", roles: ["Sous Chef", "Head Chef", "Dishwasher", "Server", "Food Critic", "Line Cook"] },
    { name: "Zoo", roles: ["Zookeeper", "Tourist", "Vet", "Ticket Seller", "Photographer", "Gift Shop Clerk"] },
    { name: "Theater", roles: ["Actor", "Director", "Stagehand", "Usher", "Critic", "Costume Designer"] },
    { name: "Train", roles: ["Conductor", "Passenger", "Ticket Inspector", "Snack Cart Worker", "Tourist", "Sleeper Car Attendant"] },
  ], spyfallKey);
}

module.exports = { applyQuestionExpansions };