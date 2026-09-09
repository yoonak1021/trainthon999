import type { ScaleDefinition } from '../types'

const pssOptions = [
  { id: 'pss-0', label: 'Never', value: 0 },
  { id: 'pss-1', label: 'Almost Never', value: 1 },
  { id: 'pss-2', label: 'Sometimes', value: 2 },
  { id: 'pss-3', label: 'Fairly Often', value: 3 },
  { id: 'pss-4', label: 'Very Often', value: 4 },
]

const phqOptions = [
  { id: 'phq-0', label: 'Not at all', value: 0 },
  { id: 'phq-1', label: 'Several days', value: 1 },
  { id: 'phq-2', label: 'More than half the days', value: 2 },
  { id: 'phq-3', label: 'Nearly every day', value: 3 },
]

export const SCALES: ScaleDefinition[] = [
  {
    id: 'pss-10',
    name: 'PSS-10',
    shortName: 'PSS-10',
    fullName: 'Perceived Stress Scale (10-item)',
    constructs: [
      'perceived stress',
      'stress',
      'psychological stress',
      'subjective stress',
    ],
    aliases: ['pss', 'pss10', 'pss-10', 'perceived stress scale'],
    instructions:
      'The questions in this scale ask you about your feelings and thoughts during the last month. In each case, you will be asked to indicate how often you felt or thought a certain way.',
    citation: 'Cohen, S., & Williamson, G. (1988). Perceived stress in a probability sample of the United States.',
    responseOptions: pssOptions,
    items: [
      {
        id: 'pss-10-1',
        number: 1,
        text: 'In the last month, how often have you been upset because of something that happened unexpectedly?',
        reverseScored: false,
      },
      {
        id: 'pss-10-2',
        number: 2,
        text: 'In the last month, how often have you felt that you were unable to control the important things in your life?',
        reverseScored: false,
      },
      {
        id: 'pss-10-3',
        number: 3,
        text: 'In the last month, how often have you felt nervous and “stressed”?',
        reverseScored: false,
      },
      {
        id: 'pss-10-4',
        number: 4,
        text: 'In the last month, how often have you felt confident about your ability to handle your personal problems?',
        reverseScored: true,
      },
      {
        id: 'pss-10-5',
        number: 5,
        text: 'In the last month, how often have you felt that things were going your way?',
        reverseScored: true,
      },
      {
        id: 'pss-10-6',
        number: 6,
        text: 'In the last month, how often have you found that you could not cope with all the things that you had to do?',
        reverseScored: false,
      },
      {
        id: 'pss-10-7',
        number: 7,
        text: 'In the last month, how often have you been able to control irritations in your life?',
        reverseScored: true,
      },
      {
        id: 'pss-10-8',
        number: 8,
        text: 'In the last month, how often have you felt that you were on top of things?',
        reverseScored: true,
      },
      {
        id: 'pss-10-9',
        number: 9,
        text: 'In the last month, how often have you been angered because of things that were outside of your control?',
        reverseScored: false,
      },
      {
        id: 'pss-10-10',
        number: 10,
        text: 'In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?',
        reverseScored: false,
      },
    ],
  },
  {
    id: 'phq-9',
    name: 'PHQ-9',
    shortName: 'PHQ-9',
    fullName: 'Patient Health Questionnaire-9',
    constructs: [
      'depression',
      'depressive symptoms',
      'major depression',
      'mood',
      'depressive disorder',
    ],
    aliases: ['phq', 'phq9', 'phq-9', 'patient health questionnaire'],
    instructions:
      'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    citation:
      'Kroenke, K., Spitzer, R. L., & Williams, J. B. W. (2001). The PHQ-9: Validity of a brief depression severity measure.',
    responseOptions: phqOptions,
    items: [
      {
        id: 'phq-9-1',
        number: 1,
        text: 'Little interest or pleasure in doing things',
        reverseScored: false,
      },
      {
        id: 'phq-9-2',
        number: 2,
        text: 'Feeling down, depressed, or hopeless',
        reverseScored: false,
      },
      {
        id: 'phq-9-3',
        number: 3,
        text: 'Trouble falling or staying asleep, or sleeping too much',
        reverseScored: false,
      },
      {
        id: 'phq-9-4',
        number: 4,
        text: 'Feeling tired or having little energy',
        reverseScored: false,
      },
      {
        id: 'phq-9-5',
        number: 5,
        text: 'Poor appetite or overeating',
        reverseScored: false,
      },
      {
        id: 'phq-9-6',
        number: 6,
        text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
        reverseScored: false,
      },
      {
        id: 'phq-9-7',
        number: 7,
        text: 'Trouble concentrating on things, such as reading the newspaper or watching television',
        reverseScored: false,
      },
      {
        id: 'phq-9-8',
        number: 8,
        text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
        reverseScored: false,
      },
      {
        id: 'phq-9-9',
        number: 9,
        text: 'Thoughts that you would be better off dead or of hurting yourself in some way',
        reverseScored: false,
      },
    ],
  },
]
