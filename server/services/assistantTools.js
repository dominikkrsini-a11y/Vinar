// The two tools the model may call. Both are pure functions from wineMath.js —
// no I/O, no Firestore, no network — so running one is cheap and cannot fail
// in a way that affects the request.
//
// The user's own logbook figures are already computed into the system prompt by
// promptBuilder.js. These tools exist for the other case: numbers the user
// types in the conversation ("pH is 3.5, how much sulfur for 300 L?").

import { computeFermentationStatus, computeSo2Advice } from './wineMath.js';

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
];

const HANDLERS = {
  so2_advice: computeSo2Advice,
  fermentation_status: computeFermentationStatus,
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
