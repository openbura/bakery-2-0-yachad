const fs=require('node:fs'),path=require('node:path');
const main=JSON.parse(fs.readFileSync(path.join(__dirname,'admin-browser-qa.json'),'utf8'));
const extra=JSON.parse(fs.readFileSync(path.join(__dirname,'admin-browser-extra.json'),'utf8'));
const tests=[...main.tests,...extra.tests].map(t=>{if(t.evidence?.trail)t.evidence.trail=t.evidence.trail.map(x=>({...x,text:x.text?.slice(0,100)}));return t});
const summary={
 date:new Date().toISOString(),target:'http://127.0.0.1:4174',mode:'Release code unchanged; dummy Auth; cloned public data; all external requests intercepted or blocked; service workers and WebSockets blocked',
 completedScenarios:tests.filter(x=>x.status==='COMPLETED').length,testHarnessErrorsFinalRuns:tests.filter(x=>x.status==='TEST_ERROR').length,
 dataPatchAttemptsFinalSuites:main.mockWrites.length+extra.mockWrites.length,rejectedSimulatedPatches:[...main.mockWrites,...extra.mockWrites].filter(x=>x.rejected).length,realRemoteWrites:0,
 consoleErrors:'Only intentional simulated HTTP 400/403 login/save/data failures; no uncaught page errors',pageErrors:[...main.pageErrors,...extra.pageErrors],
 viewports:main.viewports,
 browserConfirmedIssues:[
  {id:'A02',priority:'P1',finding:'Overview permits delivery=false and pickup=false while ordering=true and heading says open'},
  {id:'A03',priority:'P1',finding:'Editing a notice in a stale settings form re-enables delivery disabled by another manager; focus causes no refetch'},
  {id:'A04',priority:'P1',finding:'Second price dialog closes as if saved while another product is saving; second PATCH never issued'},
  {id:'A05',priority:'P2',finding:'Closed notice type leaves ordering enabled'},
  {id:'A06',priority:'P2',finding:'Unsaved settings draft disappears upon page navigation with no guard'},
  {id:'A08',priority:'P2',finding:'Keyboard focus leaves price modal; settings checkbox focus is invisible'},
  {id:'A09',priority:'P3',finding:'Comma decimal accepted for saving but suppresses large-change warning'},
  {id:'A11',priority:'P2',finding:'On mobile, persistent save failure text is hidden; after 3.6s toast vanishes and no visible failure remains'},
  {id:'A12',priority:'P3',finding:'At 390x844 daily quick controls begin 1323.5px down page; consider moving them nearer top after owner feedback'}
 ],
 visualReview:{verdict:'PARTIAL',basis:'Existing identity preserved, no redesign reference supplied; representative screenshots visually inspected',strengths:['Warm consistent cream/espresso palette','Readable Hebrew titles and clear stock states','Mobile cards and bottom navigation fit; 12 layout checks with zero horizontal overflow','Desktop products table remains readable at 1024px'],limitations:['Product tasks take substantial mobile vertical space','Small helper text and technical database language add density','Visual acceptance belongs to owner; audit does not approve a new design'],inspectedScreenshots:['admin-overview-1440.png','admin-products-390.png','admin-settings-390.png','admin-products-1024.png','admin-overview-768.png','admin-settings-1440.png','admin-mobile-error-after-toast.png','admin-overview-mobile-quick-actions.png','admin-price-save-error.png','admin-settings-mobile-notice-scroll.png']},
 testHarnessNotes:['First supplementary attempt force-clicked opacity-zero checkboxes and hit mobile overlays; corrected to user-visible label clicks. These timeouts were test-tool artifacts, not accepted product findings.','503 mock caused retry delays; explicit 403 is used for deterministic data-error UI tests.','Full-page screenshots include fixed mobile bars at capture viewport position. Centered textarea capture and hit test confirm field is reachable; no hidden-textarea defect claimed.'],
 tests,screenshots:[...main.screenshots,...extra.screenshots]
};
fs.writeFileSync(path.join(__dirname,'admin-qa-summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({completedScenarios:summary.completedScenarios,testHarnessErrorsFinalRuns:summary.testHarnessErrorsFinalRuns,dataPatchAttemptsFinalSuites:summary.dataPatchAttemptsFinalSuites,realRemoteWrites:0,screenshotCount:summary.screenshots.length},null,2));
