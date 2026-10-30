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
} as const;

export type TranslationSchema = typeof en;
