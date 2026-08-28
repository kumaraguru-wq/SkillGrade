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

const ravi = engine.recommendPathways({
  name:'Ravi',age:'28',education:'class10',currentOccupation:'Electrician helper',yearsExperience:'3',skills:'Basic wiring',
  interests:'Electrical work',preferredField:'Electrical maintenance',district:'Chennai',employmentPreference:'job',
  willingToRelocate:'no',mobilityConstraints:'local only',
});
assert.ok(ravi.length > 0,'Ravi scenario should return an electrical pathway');
assert.ok(ravi.every(item => ['Electrical','Green Jobs / Solar'].includes(item.sector)),'Ravi should receive only electrical or solar-electrical pathways');
assert.ok(ravi.every(item => item.score >= 60),'Ravi results must meet the threshold');
assert.ok(ravi[0].pathwayType.includes('Recognition of Prior Learning'),'Three years of related experience should select RPL/upskilling');

const unrelated = engine.recommendPathways({age:'25',education:'graduate',currentOccupation:'Software developer',yearsExperience:'2',skills:'coding',interests:'coding',district:'Chennai',employmentPreference:'job',willingToRelocate:'yes'});
assert.equal(unrelated.filter(item => item.sector === 'Electrical').length,0);

console.log(JSON.stringify({coding:coding.map(({name,sector,score})=>({name,sector,score})),ravi:ravi.map(({name,sector,score,pathwayType})=>({name,sector,score,pathwayType}))},null,2));
