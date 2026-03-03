// what each planet governs
const PLANET_MEANING = {
  Sun: 'your energy, vitality, and self-expression',
  Moon: 'your emotions, intuition, and inner needs',
  Mercury: 'your thinking, communication, and learning',
  Venus: 'your love life, values, and pleasures',
  Mars: 'your drive, ambition, and how you take action',
  Jupiter: 'your growth, luck, and opportunities',
  Saturn: 'your discipline, responsibilities, and challenges',
  Uranus: 'your need for change, freedom, and surprises',
  Neptune: 'your dreams, imagination, and spiritual side',
  Pluto: 'your transformation, power, and what you need to let go of',
}

// how each sign colors a planet's expression
const SIGN_FLAVOR = {
  aries: 'bold, impulsive, and direct. act first, think later. raw initiative.',
  taurus: 'steady, sensual, and stubborn. slow but unstoppable. comfort-seeking.',
  gemini: 'curious, scattered, and adaptable. buzzing with ideas. restless.',
  cancer: 'nurturing, moody, and protective. guided by feelings. home-focused.',
  leo: 'dramatic, warm, and proud. craving recognition. generous.',
  virgo: 'analytical, helpful, and critical. detail-oriented. quietly anxious.',
  libra: 'harmonious, indecisive, and charming. seeking balance. people-pleasing.',
  scorpio: 'intense, secretive, and transformative. all or nothing. deeply feeling.',
  sagittarius: 'adventurous, optimistic, and blunt. seeking meaning. freedom-loving.',
  capricorn: 'ambitious, disciplined, and reserved. playing the long game. serious.',
  aquarius: 'unconventional, detached, and idealistic. thinking differently. humanitarian.',
  pisces: 'dreamy, empathetic, and escapist. deeply intuitive. boundary-less.',
}

// what the planet-in-sign combo means for today
const TRANSIT_VIBE = {
  Sun: {
    aries: 'time to start something new. your confidence is high - use it.',
    taurus: 'slow down and enjoy what you have. focus on stability and comfort.',
    gemini: 'your curiosity peaks. talk to people, explore ideas, stay light.',
    cancer: 'home and family matter most now. nurture yourself and others.',
    leo: 'express yourself fully. creativity and romance are highlighted.',
    virgo: 'get organized. small improvements lead to big results now.',
    libra: 'relationships take center stage. seek fairness and beauty.',
    scorpio: 'dig deep. confront what you\'ve been avoiding. power moves.',
    sagittarius: 'expand your horizons. travel, learn, say yes to adventure.',
    capricorn: 'work hard now, it pays off. set long-term goals.',
    aquarius: 'break routines. connect with your community. think bigger.',
    pisces: 'trust your gut. rest, reflect, and let creativity flow.',
  },
  Moon: {
    aries: 'you feel restless and fired up. channel it into action, not arguments.',
    taurus: 'emotional comfort through food, nature, physical touch. take it easy.',
    gemini: 'your mind races. you need to talk it out. journaling helps too.',
    cancer: 'extra sensitive today. stay home if you can. self-care is essential.',
    leo: 'you crave attention and warmth. be generous and it comes back.',
    virgo: 'anxious energy. clean something, make a list, solve a small problem.',
    libra: 'you need harmony. avoid conflict but don\'t suppress your needs.',
    scorpio: 'emotions run deep. jealousy or passion may surface. be honest.',
    sagittarius: 'restless and optimistic. don\'t overcommit. enjoy the moment.',
    capricorn: 'emotional walls go up. it\'s ok to feel. don\'t bury it in work.',
    aquarius: 'emotionally detached but socially connected. group activities help.',
    pisces: 'dreamy and empathic. absorbing others\' feelings. protect your energy.',
  },
  Mercury: {
    aries: 'speak your mind but watch for sharp words. quick decisions today.',
    taurus: 'think slowly, speak carefully. practical ideas have staying power.',
    gemini: 'mercury is home here. ideas flow fast. great for writing and talking.',
    cancer: 'thinking is colored by feelings. trust emotional intelligence.',
    leo: 'dramatic communication. present ideas with confidence.',
    virgo: 'mercury is home here too. analytical clarity. perfect for planning.',
    libra: 'diplomatic words. good for negotiations and seeing both sides.',
    scorpio: 'penetrating thoughts. you see through bullshit. research mode.',
    sagittarius: 'big-picture thinking. details may slip. philosophical conversations.',
    capricorn: 'structured thinking. serious conversations. plan for the future.',
    aquarius: 'innovative ideas. unconventional solutions. think outside the box.',
    pisces: 'intuitive thinking but foggy logic. art over spreadsheets today.',
  },
  Venus: {
    aries: 'chase what you want in love. bold moves pay off.',
    taurus: 'venus is home. indulge in beauty, food, comfort. treat yourself.',
    gemini: 'flirty and curious in love. variety over depth right now.',
    cancer: 'love through caring. cook for someone. emotional security matters.',
    leo: 'love is dramatic and generous. grand gestures. romance peaks.',
    virgo: 'show love through acts of service. quiet devotion.',
    libra: 'venus is home. relationships, art, and harmony shine.',
    scorpio: 'intense attractions. all or nothing in love. deep bonding.',
    sagittarius: 'love feels like adventure. freedom in relationships.',
    capricorn: 'serious about love. commitment and loyalty over passion.',
    aquarius: 'unconventional attractions. friendship-based love.',
    pisces: 'dreamy, romantic, idealistic love. soulmate energy.',
  },
  Mars: {
    aries: 'mars is home. maximum energy and drive. go after what you want.',
    taurus: 'slow-burning determination. stubborn strength. don\'t be pushed.',
    gemini: 'scattered energy. multitask but finish something.',
    cancer: 'passive-aggressive energy. fight for family, not against them.',
    leo: 'confident action. lead boldly. physical energy is high.',
    virgo: 'productive energy. work on details. perfect your craft.',
    libra: 'action through cooperation. hard to decide, easy to compromise.',
    scorpio: 'mars is powerful here. strategic, intense, transformative action.',
    sagittarius: 'energetic and adventurous. physical activity helps. take risks.',
    capricorn: 'disciplined ambition. work hard, climb steadily.',
    aquarius: 'rebel energy. fight for causes. unconventional methods.',
    pisces: 'low physical energy but spiritual drive. go with the flow.',
  },
  Jupiter: {
    aries: 'luck through boldness. start new ventures. self-belief expands.',
    taurus: 'abundance through patience. financial growth. enjoy the process.',
    gemini: 'growth through learning and connections. say yes to conversations.',
    cancer: 'luck through nurturing. home improvements. emotional abundance.',
    leo: 'creative expansion. generosity brings more. shine big.',
    virgo: 'growth through service and health. small gains add up.',
    libra: 'partnerships bring luck. legal matters favor you.',
    scorpio: 'deep transformation brings growth. hidden resources surface.',
    sagittarius: 'jupiter is home. maximum expansion. travel, learn, believe.',
    capricorn: 'measured growth. build institutions. long-term planning pays.',
    aquarius: 'social expansion. humanitarian luck. technology opportunities.',
    pisces: 'jupiter is home. spiritual growth. compassion brings abundance.',
  },
  Saturn: {
    aries: 'learn to lead with patience. frustration is the teacher.',
    taurus: 'financial discipline required. build security slowly.',
    gemini: 'focus your mind. too many ideas, not enough follow-through.',
    cancer: 'emotional boundaries needed. family responsibilities weigh.',
    leo: 'ego is tested. authentic confidence must be earned.',
    virgo: 'perfectionism intensifies. health routines matter. don\'t overwork.',
    libra: 'relationships get real. commitment or separation.',
    scorpio: 'face your fears. control issues surface. deep restructuring.',
    sagittarius: 'freedom feels limited. find meaning in discipline.',
    capricorn: 'saturn is home. hard work, but you\'re built for this. authority grows.',
    aquarius: 'saturn is home. structure your ideals. community responsibilities.',
    pisces: 'boundaries dissolve. spiritual discipline needed. face illusions.',
  },
  Uranus: {
    aries: 'sudden new beginnings. identity shakeups. embrace the unexpected.',
    taurus: 'financial disruption or innovation. values shift unexpectedly.',
    gemini: 'radical new ideas. communication breakthroughs. mental restlessness.',
    cancer: 'home life changes suddenly. family dynamics shift.',
    leo: 'creative breakthroughs. express your unique self.',
    virgo: 'health or work routines disrupted. innovate your daily life.',
    libra: 'relationships transform suddenly. new social dynamics.',
    scorpio: 'deep psychological breakthroughs. power structures shift.',
    sagittarius: 'belief systems shattered and rebuilt. sudden travel.',
    capricorn: 'career upheaval. old structures crumble. reinvent your path.',
    aquarius: 'uranus is home. revolution in community. be the change.',
    pisces: 'spiritual awakening. dissolving old patterns. cosmic downloads.',
  },
  Neptune: {
    aries: 'identity confusion can lead to spiritual clarity. who are you really?',
    taurus: 'material illusions fade. find beauty in simplicity.',
    gemini: 'foggy thinking or inspired creativity. hard to focus.',
    cancer: 'home is a sanctuary. family boundaries blur. compassion needed.',
    leo: 'creative inspiration flows. glamour and illusion in self-image.',
    virgo: 'health mysteries. serve others selflessly. details feel impossible.',
    libra: 'idealized love. see partners clearly. artistic inspiration.',
    scorpio: 'psychic depth. hidden things surface. spiritual transformation.',
    sagittarius: 'spiritual wandering. beliefs dissolve and reform.',
    capricorn: 'career ideals vs reality. institutional fog. stay grounded.',
    aquarius: 'collective dreams shift. social idealism. technology and spirit merge.',
    pisces: 'neptune is home. maximum intuition. creativity peaks. stay grounded.',
  },
  Pluto: {
    aries: 'power in self-assertion. identity transforms completely.',
    taurus: 'deep shifts in values and finances. what truly matters?',
    gemini: 'communication transforms. powerful ideas. propaganda awareness.',
    cancer: 'family power dynamics transform. deep emotional healing.',
    leo: 'creative power unleashed. ego death and rebirth.',
    virgo: 'health transformation. work becomes a calling.',
    libra: 'relationships transform through crisis. justice sought.',
    scorpio: 'pluto is home. maximum transformation. phoenix energy.',
    sagittarius: 'belief systems destroyed and rebuilt. truth-seeking.',
    capricorn: 'power structures crumble and reform. authority shifts.',
    aquarius: 'social transformation. collective power shifts. revolution.',
    pisces: 'spiritual transformation. collective healing. endings and beginnings.',
  },
}

// why this planet being in this sign matters right now
const PLANET_WHY = {
  Sun: 'the sun spends ~30 days in each sign, setting the overall tone for everyone. it\'s the main energy of the season - the backdrop to everything else.',
  Moon: 'the moon changes sign every ~2.5 days. it\'s the fastest-moving body and sets the emotional weather. this is why your mood shifts day to day even when nothing external changes.',
  Mercury: 'mercury changes sign every 2-3 weeks and shapes how you think and communicate right now. when it\'s in a sign that clashes with your nature, misunderstandings happen more easily.',
  Venus: 'venus spends 3-4 weeks in each sign, coloring what attracts you, what feels beautiful, and how you connect. it\'s the lens on your relationships and spending right now.',
  Mars: 'mars spends ~6 weeks in each sign, driving what you fight for and how you pursue goals. it determines whether you feel energized or frustrated.',
  Jupiter: 'jupiter spends about a year in each sign. it\'s the big opportunity cycle - wherever jupiter is shows where life expands and where luck flows. this is the background blessing.',
  Saturn: 'saturn spends ~2.5 years in each sign. it\'s the long lesson. wherever saturn is, you\'re being asked to grow up, get serious, and build something lasting. it\'s hard but worth it.',
  Uranus: 'uranus spends ~7 years in each sign. it\'s generational disruption. the area of life it touches is being revolutionized for everyone. you can\'t control it, but you can ride the wave.',
  Neptune: 'neptune spends ~14 years in each sign. it dissolves old collective dreams and inspires new ones. it\'s so slow you barely notice it, but it shapes the spiritual mood of an era.',
  Pluto: 'pluto spends 12-30 years in each sign. it\'s the deepest, slowest transformation. entire power structures get rebuilt. you\'re living through a pluto transit right now whether you feel it or not.',
}

const ASPECT_MEANING = {
  conjunction: 'their energies merge and amplify each other. this is intense - the two planets act as one force. can be powerful or overwhelming depending on the planets.',
  sextile: 'they support each other with ease. opportunities flow between these two areas of life. gentle, helpful, easy to miss if you\'re not paying attention.',
  square: 'tension and friction between these two forces. this creates pressure to act. uncomfortable but productive - growth comes from working through the conflict.',
  trine: 'natural harmony. these two areas of life flow together effortlessly. gifts you may take for granted. good luck energy, but can also make you lazy.',
  opposition: 'a tug of war between two opposing needs. you\'re pulled in both directions. the lesson is balance - integrate both sides instead of choosing one.',
}

const SIGNS_ORDER = [
  'aries', 'taurus', 'gemini', 'cancer',
  'leo', 'virgo', 'libra', 'scorpio',
  'sagittarius', 'capricorn', 'aquarius', 'pisces'
]

// what each house means when a planet transits through it
const HOUSE_TRANSIT = {
  1: { area: 'you', reading: 'this hits you directly. your appearance, identity, and how you come across. very personal energy - you feel it in your body and your sense of self.' },
  2: { area: 'money & values', reading: 'affecting your finances, possessions, and self-worth. pay attention to what you spend on, earn, and what you actually value right now.' },
  3: { area: 'communication', reading: 'lighting up your daily interactions, short trips, siblings, and learning. conversations matter more than usual. pay attention to what you hear.' },
  4: { area: 'home & roots', reading: 'stirring things up at home, with family, or in your private life. your emotional foundation is activated. nesting or dealing with the past.' },
  5: { area: 'creativity & pleasure', reading: 'activating your creative side, romance, fun, and self-expression. this is where joy and drama live. what makes you feel alive?' },
  6: { area: 'daily life & health', reading: 'affecting your routines, work habits, and health. the mundane stuff that actually runs your life. time to fix, optimize, or serve.' },
  7: { area: 'relationships', reading: 'activating your partnerships - romantic, business, or close friendships. the mirror of "the other." what you attract reflects what you need.' },
  8: { area: 'transformation', reading: 'touching shared resources, intimacy, debts, and deep change. the stuff you don\'t post about. endings that lead to beginnings.' },
  9: { area: 'expansion', reading: 'lighting up travel, higher learning, beliefs, and big-picture thinking. your worldview is being shaped. seek experiences that stretch you.' },
  10: { area: 'career & reputation', reading: 'affecting your public image, career, and life direction. what the world sees. ambitions and achievements are highlighted.' },
  11: { area: 'community & hopes', reading: 'activating your social circle, friendships, groups, and future dreams. the people around you matter. collective energy over individual.' },
  12: { area: 'rest & the unseen', reading: 'touching your subconscious, rest, solitude, and what\'s hidden. this is quiet energy. dreams, intuition, and letting go.' },
}

// which house a transiting planet falls in relative to your rising sign
function getTransitHouse(planetSign, yourSign) {
  const planetIdx = SIGNS_ORDER.indexOf(planetSign)
  const yourIdx = SIGNS_ORDER.indexOf(yourSign)
  if (planetIdx === -1 || yourIdx === -1) return null
  return ((planetIdx - yourIdx + 12) % 12) + 1
}

export function getInterpretation(body, yourSign) {
  const sign = body.zodiac.sign
  const meaning = PLANET_MEANING[body.id] || ''
  const flavor = SIGN_FLAVOR[sign] || ''
  const transit = TRANSIT_VIBE[body.id]?.[sign] || ''
  const why = PLANET_WHY[body.id] || ''

  let forYou = null
  if (yourSign) {
    const house = getTransitHouse(sign, yourSign)
    if (house) {
      const h = HOUSE_TRANSIT[house]
      forYou = {
        house,
        area: h.area,
        reading: h.reading,
      }
    }
  }

  return { meaning, flavor, transit, why, forYou }
}

export function getAspectMeaning(aspectName) {
  return ASPECT_MEANING[aspectName] || ''
}

export { SIGNS_ORDER }
