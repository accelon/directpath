import {nodefs} from 'ptk/nodebundle.cjs'
import {EPUB} from './src/epub.ts'
await nodefs
import JSZip from 'jszip';
import { fromObj, writeChanged } from 'ptk/node.ts';
const filename='raw/satipatthana-9781909314368-9781909314030.epub'
const id='perspective';
const t=performance.now();
const rawcontent=fs.readFileSync(filename);
const zip = new JSZip();
await zip.loadAsync(rawcontent);
const epub=new EPUB(zip);
console.log('loaded');
// you now have every files contained in the loaded zip
const metadata=await epub.metadata();

const epilog=t=>{
    return t;
}
const {content,footnotes}=await epub.gen({id});
writeChanged('off/'+id+'.pgd',epilog(content.join('\n')),true);
writeChanged('off/'+id+'-note.pgd',fromObj(footnotes).join('\n'),true);
console.log('generated',(performance.now()-t)/1000,'s',content.length,'lines');
// console.log(out)

// zip.file("hello.txt").async("string"); // a promise of "Hello World\n"


