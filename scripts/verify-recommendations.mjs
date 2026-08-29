import { build } from 'vite';
import assert from 'node:assert/strict';

const result = await build({
  configFile:false,
  logLevel:'silent',
  build:{write:false,minify:false,lib:{entry:'src/recommendationEngine.js',formats:['es'],fileName:'engine'}},
});
const buildResult = Array.isArray(result) ? result[0] : result;
const chunk = buildResult.output.find(item => item.type === 'chunk');
const engine = await import(`data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`);

const coding = engine.recommendPathways({
  name:'Demo beneficiary',age:'24',education:'graduate',currentOccupation:'Software developer',yearsExperience:'2',
  skills:'Coding, JavaScript and web development',interests:'Coding and software development',preferredField:'Software technology',
  district:'Salem',employmentPreference:'job',willingToRelocate:'yes',mobilityConstraints:'none',
});
assert.ok(coding.length >= 3,'Coding scenario should return at least three relevant pathways');
assert.ok(coding.every(item => ['IT-ITeS','Electronics / IT'].includes(item.sector)),'Coding scenario must contain only IT/technology sectors');
assert.ok(coding.every(item => item.score >= 60),'Every shown result must meet the 60% threshold');
assert.ok(!coding.some(item => item.sector === 'Electrical'),'Coding scenario must never recommend electrical work');
assert.equal(coding[0].breakdown.nsqfNextLevelBoost,3,'Higher education should slightly boost the next NSQF level above the sector entry qualification');

const ravi = engine.recommendPathways({
  name:'Ravi',age:'28',education:'class10',currentOccupation:'Electrician helper',yearsExperience:'3',skills:'Basic wiring',
  interests:'Electrical work',preferredField:'Electrical maintenance',district:'Chennai',employmentPreference:'job',
  willingToRelocate:'no',mobilityConstraints:'local only',skillProficiencyBand:'independent',existingQualification:'none',
});
assert.ok(ravi.length > 0,'Ravi scenario should return an electrical pathway');
assert.ok(ravi.every(item => ['Electrical','Green Jobs / Solar'].includes(item.sector)),'Ravi should receive only electrical or solar-electrical pathways');
assert.ok(ravi.every(item => item.score >= 60),'Ravi results must meet the threshold');
assert.ok(ravi[0].pathwayType.includes('Recognition of Prior Learning'),'Three years of related experience should select RPL/upskilling');

const unrelated = engine.recommendPathways({age:'25',education:'graduate',currentOccupation:'Software developer',yearsExperience:'2',skills:'coding',interests:'coding',district:'Chennai',employmentPreference:'job',willingToRelocate:'yes'});
assert.equal(unrelated.filter(item => item.sector === 'Electrical').length,0);

const tailoringBeginner = engine.recommendPathways({
  name:'New entrant',age:'21',education:'class10',currentOccupation:'Unemployed',yearsExperience:'0',skills:'Basic sewing by hand',
  interests:'Tailoring and sewing',preferredField:'Garment work',district:'Coimbatore',employmentPreference:'both',willingToRelocate:'no',
},5).filter(item=>item.sector==='Apparel');
assert.ok(tailoringBeginner.length>=2,'Beginner tailoring scenario should expose a real sector progression');
assert.equal(tailoringBeginner[0].nsqfLevel,Math.min(...tailoringBeginner.map(item=>item.nsqfLevel)),'Zero relevant experience should rank the lowest eligible NSQF level first');
const progressionLevels=tailoringBeginner[0].progression.flatMap(step=>[...step.matchAll(/NSQF Level (\d+)/g)].map(match=>Number(match[1])));
assert.ok(progressionLevels.length>=2,'Roadmap should contain the selected and next real NSQF qualification');
assert.deepEqual(progressionLevels,[...progressionLevels].sort((a,b)=>a-b),'Roadmap NSQF courses must be ordered by level ascending');
assert.ok(progressionLevels.some(level=>level>tailoringBeginner[0].nsqfLevel),'Roadmap should name a real higher-level same-sector course');

const qualifiedTailor=engine.recommendPathways({
  age:'24',education:'class10',existingQualification:'NSQF Level 2 tailoring certificate',currentOccupation:'Tailoring learner',yearsExperience:'0',
  skills:'Basic sewing',interests:'Tailoring',preferredField:'Garment work',district:'Coimbatore',employmentPreference:'both',willingToRelocate:'no',
},5).find(item=>item.sector==='Apparel'&&item.nsqfLevel===3);
assert.equal(qualifiedTailor?.breakdown.nsqfNextLevelBoost,3,'A qualification one level above an existing NSQF certificate should receive the small progression boost');

const independentTailor=engine.recommendPathways({
  age:'29',education:'class10',currentOccupation:'Tailor',yearsExperience:'3',skills:'Stitching, measurement and pattern cutting',
  interests:'Tailoring',preferredField:'Garment work',district:'Coimbatore',employmentPreference:'self',willingToRelocate:'no',
  skillProficiencyBand:'independent',existingQualification:'none',
},10).find(item=>item.id==='Q-APP-002');
assert.ok(independentTailor?.pathwayType.includes('Recognition of Prior Learning'),'An independent tailor with sufficient experience should receive an RPL/upskilling pathway');
assert.equal(independentTailor?.breakdown.nsqfNextLevelBoost,3,'Independent proficiency should treat the sector entry level as cleared and boost the next NSQF level');

const advancedTailor=engine.recommendPathways({
  age:'34',education:'class10',currentOccupation:'Tailor',yearsExperience:'6',skills:'Independent garment construction, alterations and difficult fitting diagnosis',
  interests:'Tailoring',preferredField:'Garment work',district:'Coimbatore',employmentPreference:'self',willingToRelocate:'no',
  skillProficiencyBand:'advanced',existingQualification:'none',
},10).find(item=>item.id==='Q-APP-002');
assert.ok(advancedTailor?.pathwayType.includes('Recognition of Prior Learning'),'An advanced tailor with sufficient experience should receive an RPL/upskilling pathway');
assert.equal(advancedTailor?.breakdown.nsqfNextLevelBoost,0,'Advanced proficiency should count one level above independent, so the existing Level 3 course is no longer treated as the next level');

const assistedElectrician=engine.recommendPathways({
  age:'31',education:'class10',currentOccupation:'Electrician helper',yearsExperience:'3',skills:'Basic wiring with supervisor support',
  interests:'Electrical work',preferredField:'Electrical maintenance',district:'Chennai',employmentPreference:'job',willingToRelocate:'no',
  skillProficiencyBand:'assisted',existingQualification:'none',
},10).find(item=>item.id==='Q-ELE-001');
assert.ok(assistedElectrician,'The assisted electrician scenario should retain a relevant electrical result');
assert.equal(assistedElectrician.pathwayType,'Upskilling','An assisted worker must not receive RPL based on years alone');

console.log(JSON.stringify({coding:coding.map(({name,sector,score})=>({name,sector,score})),ravi:ravi.map(({name,sector,score,pathwayType})=>({name,sector,score,pathwayType})),beginner:tailoringBeginner.map(({name,nsqfLevel,score,progression})=>({name,nsqfLevel,score,progression}))},null,2));

const thresholdSamples = [
  {
    name:'Experienced coding, mobile',
    profile:{age:'24',education:'graduate',currentOccupation:'Software developer',yearsExperience:'2',skills:'Coding, JavaScript and web development',interests:'Coding and software development',preferredField:'Software technology',district:'Salem',employmentPreference:'job',willingToRelocate:'yes'},
  },
  {
    name:'Experienced electrician, local',
    profile:{age:'28',education:'class10',currentOccupation:'Electrician helper',yearsExperience:'3',skills:'Basic wiring and electrical tools',interests:'Electrical work',preferredField:'Electrical maintenance',district:'Chennai',employmentPreference:'job',willingToRelocate:'no'},
  },
  {
    name:'Beginner tailoring, open goal',
    profile:{age:'21',education:'class10',currentOccupation:'Unemployed',yearsExperience:'0',skills:'Basic sewing by hand',interests:'Tailoring and sewing',preferredField:'Garment work',district:'Coimbatore',employmentPreference:'both',willingToRelocate:'no'},
  },
  {
    name:'Sparse agriculture interest',
    profile:{age:'22',education:'class8',currentOccupation:'Unemployed',yearsExperience:'0',skills:'',interests:'Agriculture',preferredField:'Farming',district:'Dharmapuri',employmentPreference:'self',willingToRelocate:'no'},
  },
  {
    name:'Experienced organic farmer',
    profile:{age:'38',education:'class8',currentOccupation:'Farm worker',yearsExperience:'5',skills:'Crop cultivation, soil preparation and irrigation',interests:'Organic farming',preferredField:'Agriculture',district:'Dharmapuri',employmentPreference:'self',willingToRelocate:'no'},
  },
  {
    name:'Early-career plumber, local',
    profile:{age:'25',education:'class8',currentOccupation:'Plumber helper',yearsExperience:'1',skills:'Pipe fitting and leak repair',interests:'Plumbing and repair',preferredField:'Plumbing',district:'Madurai',employmentPreference:'job',willingToRelocate:'limited'},
  },
  {
    name:'Beauty beginner, weak skills signal',
    profile:{age:'20',education:'class10',currentOccupation:'Unemployed',yearsExperience:'0',skills:'',interests:'Beauty and makeup',preferredField:'Beauty services',district:'Chennai',employmentPreference:'both',willingToRelocate:'no'},
  },
  {
    name:'Experienced cook below course education',
    profile:{age:'42',education:'class5',currentOccupation:'Home cook',yearsExperience:'6',skills:'Cooking snacks and pickles',interests:'Food business',preferredField:'Food processing',district:'Tiruchirappalli',employmentPreference:'self',willingToRelocate:'no'},
  },
];

const thresholdReport = thresholdSamples.map(sample => {
  const matches = engine.recommendPathways(sample.profile,50);
  return {
    sample:sample.name,
    education:sample.profile.education,
    experience:Number(sample.profile.yearsExperience),
    interest:sample.profile.interests,
    district:sample.profile.district,
    matchCount:matches.length,
    topScore:matches[0]?.score ?? null,
    lowestShownScore:matches.length ? matches[matches.length-1].score : null,
    matches:matches.map(({name,sector,score})=>({name,sector,score})),
  };
});

console.log(`\nThreshold review report (MIN_RECOMMENDATION_SCORE=${engine.MIN_RECOMMENDATION_SCORE})`);
console.table(thresholdReport.map(({sample,education,experience,interest,district,matchCount,topScore,lowestShownScore})=>({sample,education,experience,interest,district,matchCount,topScore:topScore??'none',lowestShownScore:lowestShownScore??'none'})));
for(const result of thresholdReport) {
  console.log(`\n${result.sample}: ${result.matchCount} match(es)`);
  if(!result.matches.length) console.log('  No qualification met the current threshold after hard filtering.');
  for(const match of result.matches) console.log(`  ${match.score}% | ${match.sector} | ${match.name}`);
}
