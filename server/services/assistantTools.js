// The tools the model may call. All are pure functions — no I/O, no Firestore,
// no network — so running one is cheap and cannot fail in a way that affects
// the request.
//
// The user's own logbook figures are already computed into the system prompt by
// promptBuilder.js. These tools exist for the other case: numbers the user
// types in the conversation ("pH is 3.5, how much sulfur for 300 L?").

import { computeFermentationStatus, computeSo2Advice } from './wineMath.js';
import { computeYeastAdvice } from './yeastStrategy.js';

export const assistantTools = [
  {
    name: 'so2_advice',
    description:
      'Calculate how much free SO₂ a wine needs, from its pH and stage. Use this when the user ' +
      'gives a pH or free SO₂ value that is not already in their logbook. Returns the required ' +
      'free SO₂ in ppm, how much to add, and the grams of potassium metabisulfite needed.',
    input_schema: {
      type: 'object',
      properties: {
        ph: { type: 'number', description: 'Wine or must pH, e.g. 3.35' },
        wineType: {
          type: 'string',
          description: 'Wine type — "white", "rose", "orange" and "sparkling" use the 0.8 molecular target, "red" uses 0.5',
        },
        stage: {
          type: 'string',
          enum: ['must', 'fermenting', 'post_mlf', 'aging', 'pre_bottling'],
          description: 'Where the wine is in the process. Defaults to aging.',
        },
        currentFreeSo2: { type: 'number', description: 'Last measured free SO₂ in ppm, if known' },
        volumeL: { type: 'number', description: 'Volume in litres, to convert the dose into grams' },
        mlfPlanned: { type: 'boolean', description: 'True if malolactic fermentation is planned, which caps the crush dose' },
      },
      required: ['ph', 'wineType'],
    },
  },
  {
    name: 'fermentation_status',
    description:
      'Judge whether a fermentation is healthy, slow, stuck, not started or finished, from a series ' +
      'of density readings. Use this when the user gives densities or dates that are not already in ' +
      'their logbook. Returns the status, the drop rate per day and what to do about it.',
    input_schema: {
      type: 'object',
      properties: {
        readings: {
          type: 'array',
          description: 'Readings oldest first. At least two are needed to judge a trend.',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'ISO date, e.g. 2025-09-12' },
              density: { type: 'number', description: 'Density as g/L (1080) or specific gravity (1.080)' },
              temperature: { type: 'number', description: 'Temperature in °C' },
              sugar: { type: 'number', description: 'Residual sugar in g/L' },
            },
          },
        },
        wineType: { type: 'string', description: 'Wine type, used to judge whether the temperature is too high' },
      },
      required: ['readings'],
    },
  },
  {
    name: 'yeast_advice',
    description:
      'Recommend a yeast STRATEGY first (neutral/structural, aromatic, fresh commercial, or ' +
      'stuck-ferment restart), then 1–2 example strains. Use for yeast questions. Pass situation ' +
      '"stuck_restart" when fermentation is stuck. If style is unknown and the variety has no clear ' +
      'playbook, the tool returns one clarifying question — ask that, do not invent a strain.',
    input_schema: {
      type: 'object',
      properties: {
        grape: { type: 'string', description: 'Grape variety, e.g. Grk, Malvazija, Plavac Mali' },
        wineType: { type: 'string', description: 'Wine type — white, red, rose, etc.' },
        styleGoal: {
          type: 'string',
          enum: ['aromatic', 'neutral_structural', 'fresh_commercial'],
          description: 'Style goal when known. Omit to use variety playbook or ask one question.',
        },
        potentialAlcohol: { type: 'number', description: 'Estimated potential alcohol % if known' },
        brix: { type: 'number', description: 'Must Brix if known' },
        babo: { type: 'number', description: 'Must Babo if known' },
        tempControl: { type: 'boolean', description: 'True if the cellar has temperature control' },
        yan: { type: 'number', description: 'YAN in mg/L N if known' },
        situation: {
          type: 'string',
          enum: ['healthy_start', 'stuck_restart'],
          description: 'healthy_start for normal pitching; stuck_restart for a stuck fermentation',
        },
        premium: {
          type: 'boolean',
          description: 'True when aiming for a premium/structural style (especially Grk)',
        },
      },
      required: [],
    },
  },
];

const HANDLERS = {
  so2_advice: computeSo2Advice,
  fermentation_status: computeFermentationStatus,
  yeast_advice: computeYeastAdvice,
};

// Always returns a JSON string, never throws — a tool failure must come back to
// the model as data it can talk about, not as a 500 for the user.
export function runTool(name, input) {
  const handler = HANDLERS[name];
  if (!handler) {
    return JSON.stringify({ ok: false, reason: `Unknown tool: ${name}` });
  }

  try {
    return JSON.stringify(handler(input || {}));
  } catch {
    return JSON.stringify({ ok: false, reason: 'Could not compute that — check the values given.' });
  }
}
