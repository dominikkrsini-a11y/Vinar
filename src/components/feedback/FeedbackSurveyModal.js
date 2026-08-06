import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, TextInput,
} from 'react-native';
import { colors } from '../../theme/colors';

/**
 * Lightweight one-shot micro-survey modal.
 *
 * choices: [{ value: 'yes', label: 'Yes' }, ...]
 * reasonOptions: optional [{ value: 'too_many_fields', label: '...' }, ...]
 *   shown after choosing a negative choice (needsReasons).
 * needsComment(choice): when true, show a 1-line comment field before submit.
 * onSubmit({ choice, comment, reasons }): called when the user confirms.
 * onDismiss(): skip / close without answering.
 */
export function FeedbackSurveyModal({
  visible,
  title,
  choices = [],
  reasonOptions = [],
  needsComment,
  needsReasons,
  commentPlaceholder,
  reasonsPrompt,
  submitLabel,
  skipLabel,
  otherReasonValue = 'other',
  onSubmit,
  onDismiss,
}) {
  const [choice, setChoice] = useState(null);
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!visible) {
      setChoice(null);
      setSelectedReasons([]);
      setComment('');
    }
  }, [visible]);

  const showReasons = Boolean(choice && needsReasons?.(choice) && reasonOptions.length > 0);
  const showComment = Boolean(
    choice && (
      needsComment?.(choice) ||
      (showReasons && selectedReasons.includes(otherReasonValue))
    )
  );
  // After a choice that needs follow-up, require an explicit submit so the
  // optional comment/reasons can be filled in. Direct choices submit immediately.
  const needsFollowUp = Boolean(
    choice && (needsComment?.(choice) || needsReasons?.(choice))
  );

  const toggleReason = (value) => {
    setSelectedReasons((prev) => (
      prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]
    ));
  };

  const finish = (finalChoice, finalComment, finalReasons) => {
    onSubmit?.({
      choice: finalChoice,
      comment: finalComment,
      reasons: finalReasons,
    });
  };

  const handleChoicePress = (value) => {
    setChoice(value);
    if (!needsComment?.(value) && !needsReasons?.(value)) {
      finish(value, '', []);
    }
  };

  const handleSubmitFollowUp = () => {
    if (!choice) return;
    finish(choice, comment, selectedReasons);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onDismiss} hitSlop={12} accessibilityRole="button">
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {choices.map((item) => {
            const active = choice === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[styles.item, active && styles.itemActive]}
                onPress={() => handleChoicePress(item.value)}
              >
                <Text style={[styles.itemText, active && styles.itemTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {showReasons ? (
            <View style={styles.followUp}>
              {reasonsPrompt ? (
                <Text style={styles.followUpPrompt}>{reasonsPrompt}</Text>
              ) : null}
              <View style={styles.reasonRow}>
                {reasonOptions.map((opt) => {
                  const active = selectedReasons.includes(opt.value);
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.reasonChip, active && styles.reasonChipActive]}
                      onPress={() => toggleReason(opt.value)}
                    >
                      <Text style={[styles.reasonChipText, active && styles.reasonChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          {showComment ? (
            <View style={styles.followUp}>
              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={setComment}
                placeholder={commentPlaceholder}
                placeholderTextColor={colors.textMuted}
                maxLength={200}
                autoCapitalize="sentences"
              />
            </View>
          ) : null}

          {needsFollowUp ? (
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitFollowUp}>
              <Text style={styles.submitText}>{submitLabel}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.skip} onPress={onDismiss}>
            <Text style={styles.skipText}>{skipLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    paddingRight: 12,
  },
  close: {
    fontSize: 18,
    color: colors.textMuted,
    paddingHorizontal: 4,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemActive: {
    backgroundColor: colors.surfaceDeep,
  },
  itemText: {
    fontSize: 16,
    color: colors.gold,
    fontWeight: '600',
  },
  itemTextActive: {
    color: colors.gold,
  },
  followUp: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  followUpPrompt: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    backgroundColor: colors.surfaceDeep,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reasonChipActive: {
    borderColor: colors.gold,
  },
  reasonChipText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  reasonChipTextActive: {
    color: colors.gold,
    fontWeight: '600',
  },
  commentInput: {
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  submitBtn: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  skip: {
    padding: 16,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
