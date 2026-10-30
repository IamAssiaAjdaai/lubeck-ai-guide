import ts from '/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), out=path.join(root,'docs/qa/screen-flow-consolidation-2026-10-27/screen-08-slice-02-implementation-2026-10-29');
const oldRoot=path.join(root,'docs/qa/screen-flow-consolidation-2026-10-27/screen-08-storage-safety-2026-10-29/before');
const printer=ts.createPrinter({removeComments:true});
function parse(p){return ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)}
function assertions(p){let results=[];const sf=parse(p);function visit(n){if(ts.isCallExpression(n)&&/^expect\(/.test(n.getText(sf))&&ts.isPropertyAccessExpression(n.expression)){results.push(printer.printNode(ts.EmitHint.Expression,n,sf));return;}ts.forEachChild(n,visit)}visit(sf);return results;}
const preserved=[];
for(const f of ['walk-flow.behavior.tsx','screen-08-persistence-regressions.test.ts']){
 const before=assertions(path.join(oldRoot,f)),after=assertions(path.join(root,'mobile/tests',f));let remaining=[...after];const absent=[];
 for(const a of before){const i=remaining.indexOf(a);if(i<0)absent.push(a);else remaining.splice(i,1)}
 preserved.push({file:'mobile/tests/'+f,originalAssertionChains:before.length,preserved:before.length-absent.length,changedOriginalChains:absent});
}
const b=fs.readFileSync(path.join(out,'before/mobile/src/components/FirstExperience.tsx'),'utf8'), n=fs.readFileSync(path.join(root,'mobile/src/components/FirstExperience.tsx'),'utf8');
const body=s=>s.slice(s.indexOf('<ScrollView key='),s.indexOf('</ScrollView>')+'</ScrollView>'.length);
const old=parse(path.join(out,'before/mobile/src/components/NativeWalkFlow.tsx')),cur=parse(path.join(root,'mobile/src/components/NativeWalkFlow.tsx'));
function fn(sf,name){let result;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)result=printer.printNode(ts.EmitHint.Unspecified,n,sf);ts.forEachChild(n,visit)}visit(sf);return result;}
const result={assertions:preserved,firstExperienceEditorialBodyByteIdentical:body(b)===body(n),firstExperienceStylesExceptFooterIdentical:b.slice(b.indexOf('const styles'),b.indexOf('  footer:'))===n.slice(n.indexOf('const styles'),n.indexOf('  footer:')),activeStartASTUnchanged:fn(old,'start')===fn(cur,'start'),activeUpdateASTUnchanged:fn(old,'update')===fn(cur,'update')};
fs.writeFileSync(path.join(out,'assertion-and-visual-preservation.json'),JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify(result,null,2));
