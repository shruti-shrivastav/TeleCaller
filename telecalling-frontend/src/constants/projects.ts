export const PROJECT_OPTIONS = [
  'Shreya Valley',
  'Shreya Nakshtra',
  'Shreya Heights',
  'Shreya Residency',
  'Shreya City',
  'Samarth Park 1',
  'Samarth Park 2',
  'Samarth Park 3',
  'Shreedatta Park',
  'Shreya Paradise',
  'Shreya Park 1',
  'Shreya Park 2',
  'Shreya Park 3',
  'Shreya Villa 1',
  'Shreya Villa 2',
  'Shreya Greens',
] as const;

export type ProjectOption = (typeof PROJECT_OPTIONS)[number];
