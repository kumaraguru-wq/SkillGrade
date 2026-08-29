import { getPrototypeData } from './providers/livelihoodDataProvider';
import { distanceKm, districtLocations } from './location';

const { qualifications, trainingCentres, opportunities, jobs } = getPrototypeData();
const MIN_RECOMMENDATION_SCORE = 60;
const educationRank = { none:0, class5:1, class8:2, class10:3, class12:4, iti:5, diploma:5, graduate:6 };
const ontology = {
  electrical:['electrician','electrical','electric','wiring','wire','voltage'], solar:['solar','photovoltaic','pv panel','rooftop'],
  automotive:['mechanic','vehicle','bike','car','garage','automotive','two wheeler'], tailoring:['tailor','stitch','sew','sewing','garment','fashion'],
  construction:['mason','construction','brick','cement','building','steel fixer'], agriculture:['farm','farmer','crop','agriculture','dairy','cattle','irrigation'],
  plumbing:['plumb','plumber','pipe','tap'], beauty:['beauty','makeup','salon','hair','stylist'],
  computer:['computer','coding','code','programming','programmer','software','developer','development','javascript','python','web','database','testing','digital','it job','technical support'],
  retail:['retail','sales','shop','selling','store','billing'], food:['cook','cooking','food','pickle','snack','catering'], welding:['weld','welding','fabrication','metal'],
};
const sectorConcepts = {
  Electrical:['electrical'], 'Green Jobs / Solar':['solar','electrical'], Automotive:['automotive'], Apparel:['tailoring'], Construction:['construction'],
  Agriculture:['agriculture'], Plumbing:['plumbing'], 'Beauty and Wellness':['beauty'], 'IT-ITeS':['computer'], 'Electronics / IT':['computer'],
  Retail:['retail'], 'Food Processing':['food'], 'Capital Goods':['welding'],
};
const clean = value => String(value || '').trim().toLowerCase();
const includesPhrase = (text,phrase) => clean(text).includes(clean(phrase));
const unique = values => [...new Set(values)];
const intersects = (a,b) => a.some(value => b.includes(value));

export function conceptsFromText(value = '') {
  const text = clean(value);
  return Object.entries(ontology).flatMap(([concept,words]) => words.some(word => includesPhrase(text,word)) ? [concept] : []);
}
export function normaliseEducation(value = '') {
  const text = clean(value);
  if (/graduate|degree|college/.test(text)) return 'graduate';
  if (/diploma/.test(text)) return 'diploma';
  if (/iti/.test(text)) return 'iti';
  if (/12|higher secondary/.test(text)) return 'class12';
  if (/10|sslc/.test(text)) return 'class10';
  if (/8/.test(text)) return 'class8';
  if (/5/.test(text)) return 'class5';
  return educationRank[text] !== undefined ? text : 'none';
}
export function extractSkillConcepts(profile) {
  return unique(conceptsFromText([profile.currentOccupation,profile.skills,profile.interests,profile.preferredField].filter(Boolean).join(' ')));
}
function qualificationConcepts(qualification) {
  const text = [qualification.sector,qualification.name,...qualification.skillTags,...qualification.interestTags,...qualification.occupationTags].join(' ');
  return unique([...(sectorConcepts[qualification.sector] || []),...conceptsFromText(text)]);
}
const directHits = (text,tags) => tags.filter(tag => includesPhrase(text,tag));

export function checkEligibility(profile,qualification) {
  const reasons = [], education = normaliseEducation(profile.education), age = Number.parseInt(profile.age,10) || 0;
  const beneficiaryEducationRank=educationRank[education]??0, requiredEducationRank=educationRank[qualification.minEducation]??0;
  const yearsExperience=Number.parseFloat(profile.yearsExperience)||0, proficiencyBand=clean(profile.skillProficiencyBand)||'assisted';
  const relevantExperience=intersects(extractSkillConcepts(profile),qualificationConcepts(qualification));
  const rplQualified=yearsExperience>0&&yearsExperience>=qualification.rplMinExperience&&proficiencyBand!=='assisted'&&relevantExperience;
  let eligible=true;
  if (beneficiaryEducationRank<requiredEducationRank) {
    if (rplQualified&&requiredEducationRank-beneficiaryEducationRank===1) reasons.push('Experience-based education exception applied');
    else {
      reasons.push(`Requires at least ${qualification.minEducation.replace('class','Class ')}`);
      eligible=false;
    }
  }
  if (age && age < qualification.minAge) {
    reasons.push(`Minimum age is ${qualification.minAge}`);
    eligible=false;
  }
  if (age && age > qualification.maxAge) {
    reasons.push(`Prototype age limit is ${qualification.maxAge}`);
    eligible=false;
  }
  return {eligible,reasons};
}
export function buildBeneficiaryProfile(raw) {
  const district = raw.district || raw.location || '', defaults = districtLocations[district] || {};
  const yearsExperience=Number.parseFloat(raw.yearsExperience)||0;
  const requestedBand=clean(raw.skillProficiencyBand);
  const skillProficiencyBand=['assisted','independent','advanced'].includes(requestedBand)?requestedBand:'assisted';
  return {...raw,education:normaliseEducation(raw.education),yearsExperience,skillProficiencyBand,existingQualification:raw.existingQualification||'none',
    employmentPreference:raw.employmentPreference||raw.goal||'both',willingToRelocate:raw.willingToRelocate||'limited',city:raw.city||defaults.city||district,
    district,state:raw.state||defaults.state||'Tamil Nadu',latitude:Number.isFinite(Number(raw.latitude))?Number(raw.latitude):defaults.latitude,
    longitude:Number.isFinite(Number(raw.longitude))?Number(raw.longitude):defaults.longitude,skillConcepts:extractSkillConcepts(raw)};
}
const isMobile = profile => ['yes','anywhere'].includes(clean(profile.willingToRelocate));
const isLocallyAvailable = (profile,qualification) => qualification.districts.includes(profile.district);

// Mandatory deterministic gate: unrelated sectors never reach weighted scoring.
export function passesHardFilters(profile,qualification) {
  const eligibility = checkEligibility(profile,qualification);
  if (!eligibility.eligible) return {pass:false,reason:'eligibility',eligibility};
  if (!districtLocations[profile.district]) return {pass:false,reason:'unsupported-district',eligibility};
  const qConcepts = qualificationConcepts(qualification);
  const interestConcepts = conceptsFromText(`${profile.interests||''} ${profile.preferredField||''}`);
  const skillConcepts = conceptsFromText(profile.skills), occupationConcepts = conceptsFromText(profile.currentOccupation);
  const primaryConcepts = unique([...interestConcepts,...skillConcepts,...occupationConcepts]);
  if (!primaryConcepts.length || !intersects(primaryConcepts,qConcepts)) return {pass:false,reason:'unrelated-sector',eligibility};
  if (!qualification.preference.includes(profile.employmentPreference) && profile.employmentPreference !== 'both') return {pass:false,reason:'employment-preference',eligibility};
  if (!isMobile(profile) && !isLocallyAvailable(profile,qualification)) return {pass:false,reason:'mobility',eligibility};
  return {pass:true,eligibility,qConcepts,interestConcepts,skillConcepts,occupationConcepts};
}
function nearbyCentres(profile,qualification) {
  return trainingCentres.filter(c => c.sectors.includes(qualification.sector)).map(c => {
    const point = districtLocations[c.district], computed = point ? distanceKm(profile.latitude,profile.longitude,point.latitude,point.longitude) : null;
    return {...c,address:`${c.locality}, ${c.district}`,distanceKm:computed??c.distanceKm,dataStatus:'Prototype/demo'};
  }).filter(c => isMobile(profile)||c.district===profile.district).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,3);
}
function nearbyJobs(profile,qualification) {
  return jobs.filter(job => job.sector===qualification.sector && (isMobile(profile)||job.district===profile.district)).map(job => ({...job,distanceKm:distanceKm(profile.latitude,profile.longitude,job.latitude,job.longitude),dataStatus:'Prototype/demo'})).sort((a,b)=>(a.distanceKm??9999)-(b.distanceKm??9999)).slice(0,4);
}
function orderedSectorQualifications(sector) {
  return qualifications.filter(item=>item.sector===sector).slice().sort((a,b)=>a.nsqfLevel-b.nsqfLevel||a.name.localeCompare(b.name));
}
function inferredClearedNsqfLevel(profile,sectorQualifications) {
  const explicitText=[profile.existingQualification,profile.qualification,profile.certification].filter(Boolean).join(' ');
  const explicitMatch=explicitText.match(/nsqf\s*(?:level)?\s*[-:]?\s*(\d+)/i);
  const entryLevel=sectorQualifications[0]?.nsqfLevel;
  const proficiencySteps={assisted:0,independent:1,advanced:2};
  const proficiencyStep=proficiencySteps[profile.skillProficiencyBand]??0;
  const proficiencyLevel=entryLevel===undefined?null:Math.max(0,entryLevel-1+proficiencyStep);
  const educationLevel=entryLevel!==undefined&&(educationRank[profile.education]??0)>=educationRank.iti?entryLevel:null;
  const candidates=[explicitMatch?Number(explicitMatch[1]):null,educationLevel,proficiencyLevel].filter(Number.isFinite);
  return candidates.length?Math.max(...candidates):null;
}
function buildQualificationProgression(profile,qualification) {
  const ordered=orderedSectorQualifications(qualification.sector);
  const nextByLevel=[];
  for(const item of ordered) {
    if(item.nsqfLevel<=qualification.nsqfLevel||nextByLevel.some(next=>next.nsqfLevel===item.nsqfLevel))continue;
    nextByLevel.push(item);
  }
  return [
    profile.currentOccupation||'Current livelihood stage',
    `${qualification.name} (NSQF Level ${qualification.nsqfLevel})`,
    ...nextByLevel.map(item=>`${item.name} (NSQF Level ${item.nsqfLevel})`),
    qualification.jobRoles[0],
  ];
}
export function recommendPathways(rawProfile,limit=3) {
  const profile = buildBeneficiaryProfile(rawProfile), interestText = `${profile.interests||''} ${profile.preferredField||''}`, skillText=profile.skills||'', occupationText=profile.currentOccupation||'';
  return qualifications.flatMap(qualification => {
    const gate = passesHardFilters(profile,qualification);
    if (!gate.pass) return [];
    const interestDirect=directHits(interestText,[...qualification.interestTags,...qualification.skillTags]);
    const skillsDirect=directHits(skillText,[...qualification.skillTags,...qualification.occupationTags]);
    const occupationDirect=directHits(occupationText,[...qualification.occupationTags,...qualification.skillTags]);
    const interestRelated=intersects(gate.interestConcepts,gate.qConcepts), skillsRelated=intersects(gate.skillConcepts,gate.qConcepts), occupationRelated=intersects(gate.occupationConcepts,gate.qConcepts);
    const experienceRelated=profile.yearsExperience>0&&(occupationRelated||skillsRelated), preferenceMatch=qualification.preference.includes(profile.employmentPreference)||profile.employmentPreference==='both';
    const local=isLocallyAvailable(profile,qualification), mobile=isMobile(profile);
    const sectorQualifications=orderedSectorQualifications(qualification.sector), sectorEntryLevel=sectorQualifications[0]?.nsqfLevel??qualification.nsqfLevel;
    const clearedNsqfLevel=inferredClearedNsqfLevel(profile,sectorQualifications);
    const entryDistance=Math.max(0,qualification.nsqfLevel-sectorEntryLevel);
    const nsqfEntryFit=!experienceRelated?Math.max(0,8-entryDistance*3):0;
    const nsqfNextLevelBoost=clearedNsqfLevel!==null&&qualification.nsqfLevel===clearedNsqfLevel+1?3:0;
    const breakdown={interestMatch:interestDirect.length?Math.min(25,18+interestDirect.length*3):interestRelated?15:0,experienceMatch:experienceRelated?(occupationDirect.length?20:16):0,
      skillsMatch:skillsDirect.length?Math.min(25,18+skillsDirect.length*3):skillsRelated?15:0,eligibility:10,goalAlignment:preferenceMatch?10:0,mobilityLocation:local?10:mobile?8:0,
      nsqfEntryFit,nsqfNextLevelBoost};
    const score=Math.min(100,Object.values(breakdown).reduce((sum,value)=>sum+value,0));
    if (score<MIN_RECOMMENDATION_SCORE) return [];
    const rplEligible=experienceRelated&&profile.yearsExperience>=qualification.rplMinExperience&&profile.skillProficiencyBand!=='assisted';
    const pathwayType=rplEligible?'Recognition of Prior Learning / advanced upskilling':experienceRelated?'Upskilling':'Beginner training';
    const knownSkills=unique([profile.skills,profile.currentOccupation].filter(Boolean)), skillGaps=qualification.skillsGained;
    const reasons=[...gate.eligibility.reasons,interestRelated&&`Matches your stated interest in ${profile.interests||profile.preferredField}`,skillsRelated&&`Uses your existing skills: ${profile.skills}`,
      experienceRelated&&`Builds on ${profile.yearsExperience} years of relevant experience`,preferenceMatch&&`Matches your ${profile.employmentPreference==='job'?'wage-employment':profile.employmentPreference==='self'?'self-employment':'job or self-employment'} preference`,
      experienceRelated&&profile.skillProficiencyBand==='assisted'&&'Uses upskilling because you currently work with supervision',
      experienceRelated&&profile.skillProficiencyBand==='independent'&&'Recognises that you handle routine work independently',
      experienceRelated&&profile.skillProficiencyBand==='advanced'&&'Recognises independent diagnosis and unfamiliar problem-solving',
      !experienceRelated&&qualification.nsqfLevel===sectorEntryLevel&&`Provides the sector's lowest eligible NSQF entry point (Level ${sectorEntryLevel})`,
      nsqfNextLevelBoost>0&&`Progresses one NSQF level above your existing qualification or education-based entry level`,
      local?`Training is represented in ${profile.district}`:mobile&&'Included because you can travel for work or training'].filter(Boolean);
    const progression=buildQualificationProgression(profile,qualification);
    return [{...qualification,score,breakdown,eligibility:gate.eligibility,pathwayType,reasons,knownSkills,skillGaps,sectorEntryLevel,relevantExperienceYears:experienceRelated?profile.yearsExperience:0,trainingCentres:nearbyCentres(profile,qualification),jobs:nearbyJobs(profile,qualification),opportunities:opportunities.filter(x=>x.sector===qualification.sector&&(mobile||x.district===profile.district)),selfEmploymentFit:profile.employmentPreference!=='job'?qualification.selfEmployment:[],progression}];
  }).sort((a,b)=>b.score-a.score||(a.relevantExperienceYears===0&&b.relevantExperienceYears===0&&a.sector===b.sector?a.nsqfLevel-b.nsqfLevel:0)||b.breakdown.experienceMatch-a.breakdown.experienceMatch||b.breakdown.skillsMatch-a.breakdown.skillsMatch).slice(0,limit);
}

export { qualifications,trainingCentres,opportunities,jobs,MIN_RECOMMENDATION_SCORE };
