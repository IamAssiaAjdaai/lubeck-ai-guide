from pathlib import Path
import subprocess,sys,json,xml.etree.ElementTree as ET,re
out=Path('/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/docs/qa/screen-flow-consolidation-2026-10-27/screen-08-native-qa-recovery-2026-10-29');out.mkdir(exist_ok=True)
def adb(*a):return subprocess.run(['adb','-s','emulator-5554',*a],capture_output=True,check=True,timeout=25).stdout
label=sys.argv[1]
adb('shell','uiautomator','dump','/sdcard/citywalk-native-qa.xml')
raw=adb('exec-out','cat','/sdcard/citywalk-native-qa.xml');(out/(label+'.xml')).write_bytes(raw)
(out/(label+'.png')).write_bytes(adb('exec-out','screencap','-p'))
nodes=[]
for n in ET.fromstring(raw).iter('node'):
 a=n.attrib
 if a.get('text') or a.get('content-desc'):nodes.append({k:a.get(k) for k in ['text','content-desc','class','package','clickable','checkable','checked','enabled','bounds']})
(out/(label+'.json')).write_text(json.dumps(nodes,indent=2,ensure_ascii=False)+'\n')
print(json.dumps([{k:n[k] for k in ["text","content-desc","checked","enabled","bounds"]} for n in nodes if any(ch.isalnum() for ch in (n["text"] or n["content-desc"] or ""))],ensure_ascii=False)[:9500])
