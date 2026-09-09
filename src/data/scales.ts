import type { ValidatedScale } from '../types/database'

/**
 * Hardcoded validated scales available to researchers when building a survey.
 * PSS-10 is the primary example: accurate wording, 0–4 anchors, reverse flags.
 */

const pssAnchors = [
  { label: 'Never', value: 0 },
  { label: 'Almost Never', value: 1 },
  { label: 'Sometimes', value: 2 },
  { label: 'Fairly Often', value: 3 },
  { label: 'Very Often', value: 4 },
]

export const PSS_10: ValidatedScale = {
  id: 'pss-10',
  shortName: 'PSS-10',
  fullName: 'Perceived Stress Scale (10-item)',
  instructions:
    'The questions in this scale ask you about your feelings and thoughts during the last month. In each case, you will be asked to indicate how often you felt or thought a certain way.',
  citation:
    'Cohen, S., & Williamson, G. (1988). Perceived stress in a probability sample of the United States. In S. Spacapan & S. Oskamp (Eds.), The social psychology of health (pp. 31–67). Sage.',
  itemType: 'likert',
  responseOptions: pssAnchors,
  leftAnchor: 'Never',
  rightAnchor: 'Very Often',
  items: [
    {
      position: 1,
      text: 'In the last month, how often have you been upset because of something that happened unexpectedly?',
      reverseScored: false,
      variableSuffix: '1',
    },
    {
      position: 2,
      text: 'In the last month, how often have you felt that you were unable to control the important things in your life?',
      reverseScored: false,
      variableSuffix: '2',
    },
    {
      position: 3,
      text: 'In the last month, how often have you felt nervous and “stressed”?',
      reverseScored: false,
      variableSuffix: '3',
    },
    {
      // Reverse-scored: higher frequency = lower stress
      position: 4,
      text: 'In the last month, how often have you felt confident about your ability to handle your personal problems?',
      reverseScored: true,
      variableSuffix: '4',
    },
    {
      position: 5,
      text: 'In the last month, how often have you felt that things were going your way?',
      reverseScored: true,
      variableSuffix: '5',
    },
    {
      position: 6,
      text: 'In the last month, how often have you found that you could not cope with all the things that you had to do?',
      reverseScored: false,
      variableSuffix: '6',
    },
    {
      position: 7,
      text: 'In the last month, how often have you been able to control irritations in your life?',
      reverseScored: true,
      variableSuffix: '7',
    },
    {
      position: 8,
      text: 'In the last month, how often have you felt that you were on top of things?',
      reverseScored: true,
      variableSuffix: '8',
    },
    {
      position: 9,
      text: 'In the last month, how often have you been angered because of things that were outside of your control?',
      reverseScored: false,
      variableSuffix: '9',
    },
    {
      position: 10,
      text: 'In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?',
      reverseScored: false,
      variableSuffix: '10',
    },
  ],
}

/** Scales offered in the researcher “add validated scale” picker. */
export const VALIDATED_SCALES: ValidatedScale[] = [PSS_10]

export function getValidatedScale(id: string): ValidatedScale | undefined {
  return VALIDATED_SCALES.find((s) => s.id === id)
}
