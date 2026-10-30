export const en = {
  startScreen: {
    titleLine1: 'RIDICULOUS',
    titleLine2: 'ROUTES',
    playButton: 'PLAY',
  },
  levelSelect: {
    heading: 'SELECT A ROUTE',
    subtitle: 'Plan your ship route to balance cost, time, safety and emissions.',
    level1Title: 'Level 1: First Voyage',
    level1Subtitle: 'Basic routing tutorial',
    backToTitle: 'Back to Title',
  },
  meters: {
    budget: 'Budget (Cost)',
    time: 'Time',
    emissions: 'Emissions (CO₂)',
  },
  speed: {
    slow: 'Slow',
    normal: 'Normal',
    fast: 'Fast',
  },
  actions: {
    undo: 'Undo',
    go: 'Go',
    retry: 'Retry',
  },
  gameOver: {
    coastalWind: 'Strong winds pushed the ship onto the coast.',
    overBudget: 'You went over the fuel budget.',
    missedDeadline: 'You missed the arrival deadline.',
  },
  levels: {
    l1: {
      title: 'First Voyage',
      newElement: 'Tutorial: routes, wind, regulated areas, speed',
      intro: 'Your first job: get the ship from port to port. The cards will show you how.',
      startName: 'Harbourtown',
      endName: 'Cape Haven',
    },
    l2: {
      title: 'Islands & Straits',
      newElement: 'Narrow straits',
      intro: 'A narrow strait can save a long detour. Thread it carefully, or sail around.',
      startName: 'Northwick',
      endName: 'Southport',
    },
    l3: {
      title: 'Wind & Storms',
      newElement: 'Wind and storms',
      intro: 'Tailwinds push you along, headwinds slow you down. Storms near a coast will wreck the ship.',
      startName: 'Gale Point',
      endName: 'Stillwater',
    },
    l4: {
      title: 'Regulated Waters',
      newElement: 'Emission control areas',
      intro: 'Striped areas require cleaner fuel: it costs more, but emits much less.',
      startName: 'Greenbay',
      endName: 'Port Clara',
    },
    l5: {
      title: 'Against the Clock',
      newElement: 'Speed and deadlines',
      intro: 'Fast legs arrive sooner but burn far more fuel. Mix speeds to beat the deadline.',
      startName: 'Rushford',
      endName: 'Timely Bay',
    },
    l6: {
      title: 'Ride the Current',
      newElement: 'Ocean currents',
      intro: 'Flowing lines show ocean currents. Ride one to save time and fuel.',
      startName: 'Drift Harbour',
      endName: 'Eddyport',
    },
    l7: {
      title: 'The Grand Passage',
      newElement: 'Everything combined',
      intro: 'Wind, currents, regulated areas and a tight schedule. Balance them all.',
      startName: 'Old Wharf',
      endName: 'Far Haven',
    },
  },
  debug: {
    world: 'world',
    land: 'land',
    water: 'water',
  },
} as const;

export type TranslationSchema = typeof en;
