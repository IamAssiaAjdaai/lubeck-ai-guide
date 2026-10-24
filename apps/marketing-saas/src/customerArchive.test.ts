import { describe,it,expect } from 'vitest';
import {customerArchive} from './customerArchive';
describe('customer export archive boundaries',()=>{
 it('writes customer-only relative files with local and central records',()=>{const bytes=customerArchive([{name:'post-1/beitrag.md',base64:btoa('Approved synthetic text')}]);const v=new DataView(bytes.buffer);expect(v.getUint32(0,true)).toBe(0x04034b50);expect(v.getUint32(bytes.length-22,true)).toBe(0x06054b50);expect(new TextDecoder().decode(bytes)).toContain('post-1/beitrag.md');});
 it.each(['../key.txt','/private/key.txt','post-1/../../key.txt','secret.env','post-1\\beitrag.md'])('rejects noncustomer/archive traversal filename %s',name=>{expect(()=>customerArchive([{name,base64:btoa('x')}])).toThrow();});
});
