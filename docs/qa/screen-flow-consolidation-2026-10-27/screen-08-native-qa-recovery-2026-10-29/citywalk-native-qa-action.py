import subprocess,sys,xml.etree.ElementTree as ET,re,json
from pathlib import Path
out=Path('/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/docs/qa/screen-flow-consolidation-2026-10-27/screen-08-native-qa-recovery-2026-10-29')
def adb(*args):return subprocess.run(['adb','-s','emulator-5554',*args],capture_output=True,check=True,timeout=25).stdout
focus=adb('shell','dumpsys','window').decode();assert 'com.citywalk.app.dev' in '\n'.join(l for l in focus.splitlines() if 'mCurrentFocus' in l), 'Unexpected focused app'
kind=sys.argv[1];detail={}
if kind=='tap':
 query=sys.argv[2];adb('shell','uiautomator','dump','/sdcard/citywalk-native-qa.xml');raw=adb('exec-out','cat','/sdcard/citywalk-native-qa.xml');nodes=[n.attrib for n in ET.fromstring(raw).iter('node')]
 exact=[a for a in nodes if query in [a.get('text'),a.get('content-desc')] and a.get('enabled')=='true'];assert exact,f'Visible enabled target missing: {query}'
 exact.sort(key=lambda a:(a.get('clickable')!='true',a.get('content-desc')!=query));a=exact[0];x1,y1,x2,y2=map(int,re.findall(r'\d+',a['bounds']));assert x2>x1 and y2>y1 and 0<=x1<x2<=1080 and 0<=y1<y2<=2424
 x,y=(x1+x2)//2,(y1+y2)//2;adb('shell','input','tap',str(x),str(y));detail={'query':query,'bounds':a['bounds'],'point':[x,y]}
elif kind=='back':adb('shell','input','keyevent','KEYCODE_BACK')
else:raise ValueError(kind)
with (out/'android-actions.jsonl').open('a') as f:f.write(json.dumps({'action':kind,**detail},ensure_ascii=False)+'\n')
print({'action':kind,**detail})
