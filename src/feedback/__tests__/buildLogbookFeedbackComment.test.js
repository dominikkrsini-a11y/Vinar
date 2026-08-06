import { buildLogbookFeedbackComment } from '../buildLogbookFeedbackComment';

describe('buildLogbookFeedbackComment', () => {
  it('joins reason labels and an optional note', () => {
    expect(buildLogbookFeedbackComment(
      ['Too many fields', 'Hard to edit'],
      'buttons are small'
    )).toBe('Too many fields; Hard to edit; buttons are small');
  });

  it('returns undefined when nothing was provided', () => {
    expect(buildLogbookFeedbackComment([], '')).toBeUndefined();
    expect(buildLogbookFeedbackComment(null, '   ')).toBeUndefined();
  });

  it('keeps note-only comments', () => {
    expect(buildLogbookFeedbackComment([], 'just a note')).toBe('just a note');
  });
});
