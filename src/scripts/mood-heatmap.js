/**
 * Mood/Sentiment Heatmap Module
 *
 * Analyzes poem lines for emotional sentiment and renders a visual
 * heatmap strip showing the poem's emotional journey.
 *
 * Uses stem-based matching: each root stem catches all word forms
 * (e.g. "abandon" matches "abandoned", "abandoning", "abandonment").
 * Also includes a scored lexicon with intensity weights.
 */

// Scored stems: [stem, weight] — weight from 0.1 (mild) to 0.5 (intense)
// Matching: if a word starts with the stem, it matches.
const POSITIVE_STEMS = [
  // Joy & happiness
  ['joy', 0.4], ['happy', 0.4], ['happi', 0.4], ['elat', 0.4], ['ecsta', 0.5],
  ['deligh', 0.4], ['cheer', 0.3], ['merry', 0.3], ['glee', 0.3], ['jubil', 0.4],
  ['bliss', 0.5], ['euph', 0.5], ['exult', 0.4], ['revel', 0.3], ['rejoic', 0.4],
  ['pleas', 0.3], ['enjoy', 0.3], ['satisf', 0.3], ['content', 0.3], ['glad', 0.3],
  ['thrill', 0.4], ['excit', 0.3], ['amuse', 0.3], ['playful', 0.3], ['fun', 0.2],
  // Love & affection
  ['love', 0.4], ['loving', 0.4], ['ador', 0.4], ['cherish', 0.4], ['devot', 0.4],
  ['affection', 0.3], ['fond', 0.3], ['tender', 0.3], ['endear', 0.3], ['caress', 0.3],
  ['embrac', 0.3], ['kiss', 0.3], ['hug', 0.2], ['intimat', 0.3], ['passion', 0.4],
  ['romant', 0.3], ['belov', 0.4], ['sweetheart', 0.3], ['darling', 0.3],
  // Hope & optimism
  ['hope', 0.4], ['optimi', 0.4], ['aspir', 0.3], ['faith', 0.3], ['believ', 0.3],
  ['confid', 0.3], ['trust', 0.3], ['promis', 0.3], ['dream', 0.3], ['wish', 0.2],
  ['yearn', 0.2], ['desir', 0.2], ['longing', 0.1], ['imagin', 0.2], ['envision', 0.3],
  ['possibl', 0.2], ['potenti', 0.2], ['future', 0.2], ['tomorro', 0.2], ['await', 0.2],
  // Peace & calm
  ['peac', 0.4], ['calm', 0.3], ['seren', 0.4], ['tranquil', 0.4], ['quiet', 0.2],
  ['still', 0.1], ['gentle', 0.3], ['soft', 0.2], ['smooth', 0.2], ['ease', 0.2],
  ['comfort', 0.3], ['sooth', 0.3], ['relax', 0.3], ['rest', 0.2], ['settl', 0.1],
  ['harmon', 0.3], ['balanc', 0.2], ['steady', 0.2], ['safe', 0.3], ['secur', 0.3],
  ['shelter', 0.3], ['refuge', 0.3], ['sanctu', 0.4], ['haven', 0.3],
  // Beauty & wonder
  ['beaut', 0.4], ['wonder', 0.4], ['magnific', 0.4], ['splendid', 0.4],
  ['gorgeous', 0.4], ['stunn', 0.4], ['elegant', 0.3], ['grace', 0.3],
  ['lovely', 0.3], ['exquisit', 0.4], ['marvel', 0.4], ['miracl', 0.4],
  ['enchant', 0.4], ['magic', 0.3], ['mystic', 0.3], ['awe', 0.3],
  ['majestic', 0.4], ['glorious', 0.4], ['divine', 0.4], ['sublime', 0.4],
  ['radiant', 0.4], ['resplend', 0.4], ['dazzl', 0.3],
  // Light & warmth
  ['light', 0.3], ['bright', 0.3], ['shin', 0.3], ['glow', 0.3], ['gleam', 0.3],
  ['spark', 0.3], ['glitter', 0.3], ['shimmer', 0.3], ['lumin', 0.3],
  ['illumin', 0.3], ['radiat', 0.3], ['brillian', 0.3], ['vivid', 0.3],
  ['warm', 0.3], ['sun', 0.3], ['dawn', 0.3], ['morning', 0.2], ['golden', 0.3],
  ['amber', 0.2], ['flame', 0.2], ['fire', 0.2], ['candl', 0.2],
  // Growth & renewal
  ['grow', 0.3], ['bloom', 0.4], ['blossom', 0.4], ['flourish', 0.4],
  ['thrive', 0.4], ['prosper', 0.3], ['fertile', 0.3], ['seed', 0.2],
  ['sprout', 0.3], ['green', 0.2], ['spring', 0.3], ['renew', 0.4],
  ['reviv', 0.4], ['restor', 0.3], ['rebirth', 0.4], ['reborn', 0.4],
  ['resurrect', 0.4], ['awaken', 0.3], ['emerg', 0.3], ['unfold', 0.3],
  ['evolv', 0.3], ['transform', 0.3], ['metamorph', 0.3],
  // Strength & courage
  ['strong', 0.3], ['strength', 0.3], ['power', 0.3], ['mighty', 0.3],
  ['brave', 0.4], ['courag', 0.4], ['bold', 0.3], ['fearless', 0.4],
  ['hero', 0.3], ['valiant', 0.4], ['resilient', 0.4], ['endur', 0.3],
  ['persever', 0.3], ['determin', 0.3], ['resolut', 0.3], ['steadfast', 0.3],
  ['unwaver', 0.3], ['conquer', 0.3], ['triumph', 0.4], ['victor', 0.4],
  ['overcom', 0.4], ['prevail', 0.3], ['surviv', 0.3],
  // Freedom & liberation
  ['free', 0.4], ['freedom', 0.4], ['liberat', 0.4], ['release', 0.3],
  ['unleash', 0.3], ['soar', 0.4], ['fly', 0.3], ['flight', 0.3],
  ['wing', 0.2], ['float', 0.2], ['drift', 0.1], ['wander', 0.1],
  ['roam', 0.2], ['explor', 0.3], ['discover', 0.3], ['adventur', 0.3],
  ['journey', 0.2], ['voyage', 0.2], ['quest', 0.2],
  // Connection & community
  ['togeth', 0.3], ['connect', 0.3], ['unite', 0.3], ['bond', 0.3],
  ['belong', 0.3], ['commun', 0.3], ['friend', 0.3], ['companion', 0.3],
  ['famil', 0.3], ['kinship', 0.3], ['brother', 0.2], ['sister', 0.2],
  ['gather', 0.2], ['share', 0.2], ['caring', 0.3], ['compassion', 0.4],
  ['empath', 0.3], ['kind', 0.3], ['generous', 0.3], ['giving', 0.3],
  // Nature positive
  ['flower', 0.3], ['petal', 0.3], ['garden', 0.3], ['meadow', 0.3],
  ['forest', 0.2], ['river', 0.2], ['ocean', 0.2], ['mountain', 0.2],
  ['breez', 0.2], ['rainbow', 0.3], ['bird', 0.2], ['butterfli', 0.3],
  ['butterfly', 0.3], ['honey', 0.2], ['nectar', 0.2],
  // Music & art
  ['sing', 0.3], ['song', 0.3], ['melod', 0.3], ['music', 0.3],
  ['danc', 0.3], ['rhythm', 0.2], ['paint', 0.2], ['creat', 0.3],
  ['art', 0.2], ['inspir', 0.3], ['muse', 0.2], ['poet', 0.2],
  // Spiritual / transcendent
  ['soul', 0.3], ['spirit', 0.3], ['sacred', 0.3], ['holy', 0.3],
  ['bless', 0.3], ['prayer', 0.3], ['meditat', 0.3], ['mindful', 0.3],
  ['enlighten', 0.4], ['transcend', 0.4], ['etern', 0.3], ['infinit', 0.3],
  ['heaven', 0.3], ['angel', 0.3], ['celesti', 0.3],
  // Healing & wholeness
  ['heal', 0.4], ['cure', 0.3], ['mend', 0.3], ['repair', 0.3],
  ['whole', 0.3], ['complet', 0.3], ['fulfil', 0.4], ['nourish', 0.3],
  ['nurtur', 0.3], ['cherish', 0.3], ['protect', 0.3], ['preserv', 0.3],
  // Achievement
  ['achiev', 0.3], ['accomplish', 0.3], ['succeed', 0.3], ['success', 0.3],
  ['win', 0.3], ['earn', 0.2], ['reward', 0.3], ['prize', 0.3],
  ['celebrat', 0.4], ['honor', 0.3], ['proud', 0.3], ['pride', 0.3],
  ['glori', 0.3], ['fame', 0.2],
  // Vitality
  ['alive', 0.4], ['vital', 0.3], ['energi', 0.3], ['energy', 0.3],
  ['vigor', 0.3], ['vibrant', 0.3], ['pulse', 0.2], ['throb', 0.2],
  ['surge', 0.2], ['rush', 0.2], ['burst', 0.2], ['electric', 0.3],
  // Positive actions/states
  ['laugh', 0.4], ['smile', 0.3], ['grin', 0.3], ['giggl', 0.3],
  ['forgiv', 0.4], ['accept', 0.3], ['welcom', 0.3], ['invit', 0.2],
  ['offer', 0.2], ['gift', 0.3], ['gratitud', 0.4], ['grateful', 0.4],
  ['thank', 0.3], ['appreciat', 0.3], ['valu', 0.2], ['treasur', 0.3],
  ['precious', 0.3], ['dear', 0.2], ['sweet', 0.3], ['delicat', 0.2],
  ['pure', 0.3], ['innocent', 0.3], ['fresh', 0.2], ['clean', 0.2],
  ['clear', 0.2], ['crisp', 0.2], ['anew', 0.3],
  // Additional positive
  ['home', 0.3], ['hearth', 0.3], ['star', 0.3], ['moon', 0.2],
  ['birth', 0.3], ['begin', 0.2], ['open', 0.2], ['rising', 0.3],
  ['uplift', 0.3], ['elevat', 0.3], ['ascend', 0.3], ['climb', 0.2],
  ['reach', 0.2], ['arriv', 0.2], ['return', 0.2], ['reunion', 0.3],
  ['remember', 0.2], ['memor', 0.2], ['nostalgi', 0.2],
  ['wisdom', 0.3], ['wise', 0.3], ['learn', 0.2], ['teach', 0.2],
  ['understand', 0.3], ['clarity', 0.3], ['truth', 0.3], ['honest', 0.3],
  ['integrit', 0.3], ['dignit', 0.3], ['respect', 0.3], ['loyal', 0.3],
];

const NEGATIVE_STEMS = [
  // Sadness & grief
  ['sad', 0.3], ['sorrow', 0.4], ['grief', 0.5], ['griev', 0.5],
  ['mourn', 0.4], ['lament', 0.4], ['weep', 0.4], ['sob', 0.4],
  ['cry', 0.3], ['tear', 0.3], ['wail', 0.4], ['melan', 0.4],
  ['depress', 0.4], ['despair', 0.5], ['desper', 0.4], ['hopeless', 0.5],
  ['misery', 0.5], ['miser', 0.5], ['wretched', 0.5], ['woe', 0.4],
  ['forlorn', 0.4], ['desolat', 0.5], ['bereft', 0.4], ['dismal', 0.4],
  ['gloom', 0.4], ['bleak', 0.4], ['dreary', 0.3], ['somber', 0.3],
  ['sullen', 0.3], ['morose', 0.4], ['bitter', 0.3], ['regret', 0.3],
  ['remorse', 0.4], ['guilt', 0.3], ['sham', 0.3], ['humiliat', 0.4],
  // Fear & anxiety
  ['fear', 0.4], ['afraid', 0.4], ['fright', 0.4], ['terror', 0.5],
  ['terrif', 0.5], ['horrif', 0.5], ['horror', 0.5], ['dread', 0.4],
  ['panic', 0.4], ['anxious', 0.3], ['anxiet', 0.3], ['worr', 0.3],
  ['nervous', 0.3], ['uneasy', 0.3], ['tense', 0.3], ['paranoi', 0.4],
  ['phobia', 0.4], ['scare', 0.4], ['alarm', 0.3], ['startl', 0.3],
  ['trembl', 0.3], ['shiver', 0.3], ['quake', 0.3], ['shudder', 0.3],
  ['chill', 0.3], ['creep', 0.3], ['eerie', 0.3], ['sinister', 0.4],
  ['ominous', 0.4], ['menac', 0.4], ['threat', 0.3], ['danger', 0.3],
  // Anger & rage
  ['anger', 0.4], ['angry', 0.4], ['rage', 0.5], ['fury', 0.5],
  ['furious', 0.5], ['wrath', 0.5], ['irat', 0.4], ['livid', 0.4],
  ['hostil', 0.4], ['aggress', 0.4], ['violent', 0.4], ['violenc', 0.4],
  ['cruel', 0.4], ['brut', 0.5], ['savage', 0.4], ['vicious', 0.4],
  ['malic', 0.4], ['spite', 0.3], ['resent', 0.3], ['bitter', 0.3],
  ['vengean', 0.4], ['reveng', 0.4], ['hate', 0.5], ['hatred', 0.5],
  ['loath', 0.4], ['detest', 0.4], ['despis', 0.4], ['contempt', 0.4],
  ['disgust', 0.4], ['repuls', 0.4], ['scorn', 0.3], ['sneer', 0.3],
  // Pain & suffering
  ['pain', 0.4], ['hurt', 0.4], ['ache', 0.3], ['agony', 0.5],
  ['anguish', 0.5], ['torment', 0.5], ['tortur', 0.5], ['suffer', 0.4],
  ['wound', 0.4], ['scar', 0.3], ['bleed', 0.4], ['blood', 0.3],
  ['bruis', 0.3], ['injur', 0.3], ['damage', 0.3], ['harm', 0.3],
  ['sting', 0.3], ['burn', 0.3], ['scorch', 0.3], ['throb', 0.3],
  // Loss & absence
  ['loss', 0.4], ['lost', 0.4], ['lose', 0.3], ['losing', 0.3],
  ['miss', 0.3], ['absent', 0.3], ['absenc', 0.3], ['gone', 0.3],
  ['vanish', 0.4], ['disappear', 0.4], ['fade', 0.3], ['dim', 0.2],
  ['wane', 0.3], ['dwindl', 0.3], ['shrink', 0.3], ['diminish', 0.3],
  ['disintegrat', 0.4], ['dissolv', 0.3], ['evaporat', 0.3],
  ['erode', 0.3], ['erosion', 0.3], ['crumbl', 0.3],
  // Darkness & shadow
  ['dark', 0.3], ['shadow', 0.3], ['black', 0.2], ['night', 0.2],
  ['midnight', 0.3], ['dusk', 0.2], ['twilight', 0.2], ['dim', 0.2],
  ['murky', 0.3], ['obscu', 0.3], ['opaque', 0.2], ['void', 0.4],
  ['abyss', 0.4], ['chasm', 0.3], ['pit', 0.3], ['depth', 0.2],
  // Cold & isolation
  ['cold', 0.3], ['frozen', 0.3], ['freez', 0.3], ['frost', 0.3],
  ['ice', 0.2], ['icy', 0.3], ['numb', 0.3], ['chill', 0.3],
  ['alone', 0.4], ['lonely', 0.4], ['loneli', 0.4], ['isolat', 0.4],
  ['solitary', 0.3], ['desolat', 0.4], ['abandon', 0.4], ['forsak', 0.4],
  ['reject', 0.3], ['exclud', 0.3], ['outcast', 0.4], ['exile', 0.4],
  ['estrang', 0.4], ['alienat', 0.3], ['disconnect', 0.3], ['detach', 0.3],
  ['withdrawn', 0.3], ['reclu', 0.3],
  // Destruction & decay
  ['destroy', 0.5], ['destruct', 0.5], ['ruin', 0.4], ['wreck', 0.4],
  ['demolish', 0.4], ['devastat', 0.5], ['ravag', 0.4], ['annihilat', 0.5],
  ['shatter', 0.4], ['smash', 0.4], ['crush', 0.4], ['break', 0.3],
  ['broken', 0.4], ['crack', 0.3], ['fractur', 0.3], ['splinter', 0.3],
  ['collaps', 0.4], ['crumbl', 0.3], ['decay', 0.3], ['rot', 0.3],
  ['corrode', 0.3], ['rust', 0.3], ['wither', 0.4], ['wilt', 0.3],
  ['decompos', 0.3], ['disintegrat', 0.4], ['erode', 0.3],
  // Death & ending
  ['death', 0.5], ['dead', 0.5], ['die', 0.4], ['dying', 0.4],
  ['kill', 0.5], ['murder', 0.5], ['slay', 0.5], ['perish', 0.4],
  ['doom', 0.4], ['fatal', 0.4], ['mortal', 0.3], ['funer', 0.4],
  ['grave', 0.3], ['tomb', 0.3], ['corpse', 0.4], ['ghost', 0.3],
  ['haunt', 0.3], ['phantom', 0.3], ['specter', 0.3], ['wraith', 0.3],
  ['undead', 0.4], ['zombie', 0.3], ['skeleton', 0.3],
  ['end', 0.2], ['ending', 0.3], ['final', 0.2], ['last', 0.2],
  ['finish', 0.2], ['conclud', 0.2], ['terminal', 0.3], ['extinct', 0.4],
  // Emptiness & void
  ['empty', 0.4], ['hollow', 0.4], ['vacant', 0.3], ['barren', 0.4],
  ['bare', 0.3], ['blank', 0.3], ['void', 0.4], ['nothing', 0.3],
  ['nowhere', 0.3], ['meaningless', 0.4], ['pointless', 0.4], ['vain', 0.3],
  ['futile', 0.4], ['useless', 0.3], ['worthless', 0.4], ['insignific', 0.3],
  // Captivity & constraint
  ['trap', 0.4], ['cage', 0.4], ['prison', 0.4], ['captiv', 0.4],
  ['chain', 0.3], ['shackl', 0.4], ['bind', 0.3], ['bound', 0.3],
  ['confin', 0.3], ['restrict', 0.3], ['suppress', 0.3], ['oppress', 0.4],
  ['suffoc', 0.4], ['smother', 0.4], ['stifle', 0.3], ['choke', 0.4],
  ['strangl', 0.4], ['drown', 0.4], ['submerg', 0.3], ['swallow', 0.3],
  ['consum', 0.3], ['devour', 0.3], ['engulf', 0.3],
  // Conflict & war
  ['war', 0.4], ['battle', 0.3], ['fight', 0.3], ['combat', 0.3],
  ['conflict', 0.3], ['struggle', 0.3], ['clash', 0.3], ['strife', 0.3],
  ['weapon', 0.3], ['sword', 0.3], ['bullet', 0.4], ['bomb', 0.4],
  ['explosion', 0.4], ['blast', 0.3],
  // Betrayal & deception
  ['betray', 0.4], ['deceiv', 0.4], ['deceit', 0.4], ['decept', 0.4],
  ['trick', 0.3], ['cheat', 0.3], ['fraud', 0.3], ['manipul', 0.3],
  ['exploit', 0.3], ['corrupt', 0.4], ['poison', 0.4], ['toxic', 0.4],
  ['taint', 0.3], ['contamin', 0.3], ['infect', 0.3], ['pollut', 0.3],
  // Negative states
  ['exhaust', 0.3], ['weary', 0.3], ['fatigue', 0.3], ['tire', 0.2],
  ['drain', 0.3], ['deplet', 0.3], ['spent', 0.3], ['weak', 0.3],
  ['feeble', 0.3], ['fragil', 0.2], ['frail', 0.3], ['vulner', 0.3],
  ['helpless', 0.4], ['powerless', 0.4], ['defens', 0.3],
  ['confus', 0.3], ['bewilder', 0.3], ['perplex', 0.3], ['lost', 0.3],
  ['uncertain', 0.3], ['doubt', 0.3], ['hesitat', 0.2], ['waver', 0.2],
  // Nature negative
  ['storm', 0.3], ['thunder', 0.3], ['lightning', 0.3], ['flood', 0.3],
  ['drought', 0.3], ['earthquake', 0.4], ['avalanch', 0.4],
  ['wildfire', 0.4], ['tornado', 0.4], ['hurrican', 0.4],
  ['thorn', 0.2], ['sting', 0.3], ['venom', 0.4], ['serpent', 0.3],
  ['wolf', 0.2], ['predator', 0.3], ['prey', 0.3],
  // Silence & stagnation (mild negative in poetry context)
  ['silent', 0.2], ['silence', 0.2], ['mute', 0.2], ['speechless', 0.2],
  ['stagnant', 0.3], ['stale', 0.2], ['stuck', 0.3], ['static', 0.2],
  // Additional negative
  ['cling', 0.2], ['grasp', 0.2], ['clutch', 0.2], ['grip', 0.2],
  ['obsess', 0.3], ['fixat', 0.3], ['compuls', 0.3], ['addict', 0.3],
  ['envious', 0.3], ['envy', 0.3], ['jealous', 0.3], ['covet', 0.3],
  ['greed', 0.3], ['selfish', 0.3], ['cruel', 0.4],
  ['scar', 0.3], ['stain', 0.3], ['blemish', 0.3], ['flaw', 0.2],
  ['imperfect', 0.2], ['ugly', 0.3], ['grotesque', 0.4],
  ['ash', 0.3], ['dust', 0.2], ['rubbl', 0.3], ['debris', 0.3],
  ['remnant', 0.2], ['remain', 0.1], ['relic', 0.2],
  ['forget', 0.3], ['forgotten', 0.3], ['eras', 0.3], ['obliterat', 0.4],
  ['search', 0.1], ['seek', 0.1], ['wander', 0.1],
  ['fog', 0.2], ['mist', 0.2], ['haze', 0.2], ['blur', 0.2],
  ['scream', 0.4], ['shriek', 0.4], ['howl', 0.3], ['groan', 0.3],
  ['moan', 0.3], ['whimper', 0.3], ['whisper', 0.1],
  ['never', 0.3], ['no', 0.1], ['not', 0.1], ['without', 0.2],
];

const MOOD_THRESHOLDS = [
  { min: 0.45, label: 'Euphoric', color: '#E8C170' },
  { min: 0.25, label: 'Radiant', color: '#D4A574' },
  { min: 0.12, label: 'Hopeful', color: '#79B939' },
  { min: 0.04, label: 'Tender', color: '#6DBF8B' },
  { min: -0.04, label: 'Contemplative', color: '#908F8A' },
  { min: -0.12, label: 'Wistful', color: '#7A9FB5' },
  { min: -0.25, label: 'Melancholy', color: '#6B8BA4' },
  { min: -0.45, label: 'Anguished', color: '#8B5E8B' },
  { min: -Infinity, label: 'Desolate', color: '#6E3A6E' },
];

/**
 * Classify a score into a mood label and color.
 */
function classifyMood(score) {
  for (const threshold of MOOD_THRESHOLDS) {
    if (score >= threshold.min) {
      return { label: threshold.label, color: threshold.color };
    }
  }
  return { label: 'Contemplative', color: '#908F8A' };
}

/**
 * Check if a word matches any stem in a list.
 * Returns the weight if matched, 0 otherwise.
 */
function matchStem(word, stems) {
  for (const [stem, weight] of stems) {
    if (word === stem || word.startsWith(stem)) {
      return weight;
    }
  }
  return 0;
}

/**
 * Analyze the sentiment of a text string.
 * Returns { score: number (-1 to 1), mood: string, color: string }
 */
export function analyzeSentiment(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (words.length === 0) {
    const { label, color } = classifyMood(0);
    return { score: 0, mood: label, color };
  }

  let totalScore = 0;

  for (const word of words) {
    const posWeight = matchStem(word, POSITIVE_STEMS);
    const negWeight = matchStem(word, NEGATIVE_STEMS);

    if (posWeight > 0 && negWeight > 0) {
      // Word matches both — use the stronger signal
      totalScore += posWeight > negWeight ? posWeight : -negWeight;
    } else if (posWeight > 0) {
      totalScore += posWeight;
    } else if (negWeight > 0) {
      totalScore -= negWeight;
    }
  }

  // Normalize using square root of word count to prevent over-dilution
  // in short poetic lines (e.g. 8 words → divisor ~2.8 instead of 8)
  const divisor = Math.sqrt(words.length);
  const raw = totalScore / divisor;
  const score = Math.max(-1, Math.min(1, raw));
  const { label, color } = classifyMood(score);

  return { score, mood: label, color };
}

/**
 * Generate mood data for an array of poem lines.
 * Returns array of { lineId, score, mood, color }
 */
export function generateMoodData(lines) {
  return lines.map((line, index) => {
    const text = typeof line === 'string' ? line : line.text || '';
    const { score, mood, color } = analyzeSentiment(text);
    return { lineId: index, score, mood, color };
  });
}

/**
 * Render a horizontal heatmap strip into a container element.
 * Each line gets a colored segment; hovering shows a tooltip.
 */
export function renderMoodStrip(container, moodData) {
  if (!container || !moodData || moodData.length === 0) return;

  container.innerHTML = '';

  const strip = document.createElement('div');
  strip.className = 'mood-strip';

  const stops = [];
  moodData.forEach((entry, i) => {
    const pctStart = (i / moodData.length) * 100;
    const pctEnd = ((i + 1) / moodData.length) * 100;
    stops.push(`${entry.color} ${pctStart}%`);
    stops.push(`${entry.color} ${pctEnd}%`);
  });

  Object.assign(strip.style, {
    width: '100%',
    height: '32px',
    borderRadius: '6px',
    background: `linear-gradient(to right, ${stops.join(', ')})`,
    position: 'relative',
    cursor: 'crosshair',
    overflow: 'visible',
  });

  const tooltip = document.createElement('div');
  tooltip.className = 'mood-tooltip';
  Object.assign(tooltip.style, {
    position: 'absolute',
    bottom: '110%',
    left: '0',
    transform: 'translateX(-50%)',
    background: 'rgba(20, 20, 20, 0.92)',
    color: '#f0f0f0',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '0.78rem',
    lineHeight: '1.4',
    whiteSpace: 'nowrap',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.15s ease',
    zIndex: '10',
  });
  strip.appendChild(tooltip);

  strip.addEventListener('mousemove', (e) => {
    const rect = strip.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const idx = Math.min(
      Math.floor(pct * moodData.length),
      moodData.length - 1
    );
    const entry = moodData[idx];

    const lines = container._poemLines || [];
    const lineText =
      lines[idx] !== undefined
        ? lines[idx].length > 60
          ? lines[idx].slice(0, 57) + '...'
          : lines[idx]
        : `Line ${idx + 1}`;

    tooltip.textContent = `${lineText} — ${entry.mood}`;
    tooltip.style.left = `${x}px`;
    tooltip.style.opacity = '1';
  });

  strip.addEventListener('mouseleave', () => {
    tooltip.style.opacity = '0';
  });

  container.appendChild(strip);

  // Legend
  const legend = document.createElement('div');
  Object.assign(legend.style, {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginTop: '10px',
    flexWrap: 'wrap',
  });
  for (const t of MOOD_THRESHOLDS) {
    const item = document.createElement('span');
    Object.assign(item.style, {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '0.75rem',
      color: '#908F8A',
    });
    const dot = document.createElement('span');
    Object.assign(dot.style, {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: t.color,
      display: 'inline-block',
    });
    item.appendChild(dot);
    item.appendChild(document.createTextNode(t.label));
    legend.appendChild(item);
  }
  container.appendChild(legend);

  // Summary
  const summary = getMoodSummary(moodData);
  const summaryEl = document.createElement('p');
  summaryEl.className = 'mood-summary';
  Object.assign(summaryEl.style, {
    marginTop: '8px',
    fontSize: '0.85rem',
    color: '#908F8A',
    lineHeight: '1.5',
    textAlign: 'center',
  });

  const breakdownParts = Object.entries(summary.breakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([mood, pct]) => `${mood} ${pct}%`);

  summaryEl.innerHTML =
    `This poem feels mostly <strong style="color:${summary.dominantColor}">${summary.dominant}</strong>` +
    ` <span style="opacity:0.7">(${breakdownParts.join(', ')})</span>`;

  container.appendChild(summaryEl);
}

/**
 * Get overall mood statistics for a poem.
 */
export function getMoodSummary(moodData) {
  if (!moodData || moodData.length === 0) {
    return {
      dominant: 'Contemplative',
      dominantColor: '#908F8A',
      averageScore: 0,
      breakdown: { Contemplative: 100 },
    };
  }

  const totalScore = moodData.reduce((sum, d) => sum + d.score, 0);
  const averageScore = totalScore / moodData.length;

  const counts = {};
  for (const entry of moodData) {
    counts[entry.mood] = (counts[entry.mood] || 0) + 1;
  }

  const breakdown = {};
  for (const [mood, count] of Object.entries(counts)) {
    breakdown[mood] = Math.round((count / moodData.length) * 100);
  }

  let dominant = 'Contemplative';
  let maxCount = 0;
  for (const [mood, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = mood;
    }
  }

  const dominantColor =
    MOOD_THRESHOLDS.find((t) => t.label === dominant)?.color || '#908F8A';

  return { dominant, dominantColor, averageScore, breakdown };
}
