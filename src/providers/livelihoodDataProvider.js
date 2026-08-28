import qualificationRecords from '../data/qualifications.json';
import centreRecords from '../data/trainingCentres.json';
import demandRecords from '../data/opportunities.json';
import jobRecords from '../data/jobs.json';
import additionalItRecords from '../data/qualificationsIT.json';

const allQualifications = [...qualificationRecords, ...additionalItRecords];

// Replace these functions with official API adapters without changing the engine.
export const livelihoodDataProvider = {
  mode: 'prototype',
  async qualifications() { return allQualifications; },
  async trainingCentres() { return centreRecords; },
  async demandSignals() { return demandRecords; },
  async jobs() { return jobRecords; },
};

export function getPrototypeData() {
  return { qualifications: allQualifications, trainingCentres: centreRecords, opportunities: demandRecords, jobs: jobRecords };
}
