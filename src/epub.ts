import { autoEnglishBreak } from "ptk/align/breaker.ts";
import { entity2unicode } from "ptk/utils/html.ts";
type ContentItem ={id:string; title: string; href: string; };
export class EPUB {
    zip: any;
    footnotes: { [key: string]: string; } = {};
    constructor (zip){//external dependencies JSZip
        this.zip = zip;
    }
    async toOffText(filename:string){
        let t=(await this.zip.file('OEBPS/'+filename).async("string")).replace(/\r?\n/g,'');
        t=entity2unicode(t)
        t=t.replace(/<a id="page_(\d+)"\/>/g,'^pg$1 ');
        //foot note marker
        t=t.replace(/<small>(.+?)<\/small>/g,'^s($1)'); //remove all tags
        t=t.replace(/<i>(.+?)<\/i>/g,'^ii($1)'); //remove all tags

        //footnote
        t=t.replace(/<td.*?><a href="#r([a-z\d]+)" id="([a-z\d]+)">(\d+)<\/a><\/td><td.*?> <\/td><td.*?>(.+?)<\/td>/g,(m,f,fn,id,notetext)=>{
            const [m0,ch,ref]=fn.match(/ch(\d+)ref(\d+)/);
            const key=parseInt(ch)+'.'+ref;
            if (this.footnotes[key]) {
                console.warn('duplicate footnote',fn,notetext);
            }
            this.footnotes[key]=notetext;
            return ''
        });
        t=t.replace(/<a href="#([a-z\d]+)" id="r([a-z\d]+)">(\d+)<\/a>/g,(m,f,fn,id)=>{
            const [m0,ch,ref]=fn.match(/ch(\d+)ref(\d+)/);
            return '^i'+ref+' ';
        });
        t=t.replace(/<sup>([^\^]+?)<\/sup>/g,'^sup($1)'); //remove all tags
        t=t.replace(/<title>(.+?)<\/title>/g,'');
        t=t.replace(/<p class="chapnum">(.+?)<\/p>/g,'\n\t^y($1)');
        t=t.replace(/<p class="quote">(.+?)<\/p>/g,'\n^quote $1');
        t=t.replace(/<p class="quotei">(.+?)<\/p>/g,'\n^quotei $1');
        t=t.replace(/<p class="h(\d+)">(.+?)<\/p>/g,'\n\t^h$1($2)');
        t=t.replace(/<p class="indent">/g,'\n\t');
        t=t.replace(/<p class="noindent">/g,'\n');
        t=t.replace(/<a ([^/<]+)>([^\<]+?)<\/a>/g,(m0,id,text)=>{
            const m=id.match(/ch(\d+)fig(\d+)/);
            if (m){
                return '^fig'+parseInt(m[1])+'.'+m[2]+'('+text+')';
            }
            return '';
        })
        t=t.replace(/<[^>]+>/g,''); //remove all tags

        t=t.replace(/\^i(\d+) +/g,'^i$1 ');//extra spaces

        const lines=t.split(/\n/);
        for (let i=0;i<lines.length;i++) {
            if (lines[i].charAt(0)!=='^'&&!lines[i].startsWith('\t^')) {
                lines[i]=autoEnglishBreak(lines[i]);
            }
        }

        return lines.join('\n').replace(/\[/g,'［').replace(/\]/g,'］');
    }
    async gen({id='epub',format='offtext'}={}){
        const contents=(await this.metadata()).contents;
        const out=Array<string>();
        for (let i=0;i<contents.length;i++) {
            const content=await this.toOffText(contents[i].href);
            out.push(content);
        }
        return {content:out,footnotes:this.footnotes};
    }
    async metadata(){
        let rawtoc=(await this.zip.file('OEBPS/toc.ncx').async("string")).replace(/\r?\n/g,'');

        let m1=rawtoc.match(/<docTitle><text>(.+?)<\/text>/);
        const m2=rawtoc.match(/<docAuthor><text>(.+?)<\/text>/);
        const contents=Array<ContentItem>();

        rawtoc.replace(/<navPoint .+? id="(.+?)".+?><navLabel><text>(.+?)<\/text><\/navLabel><content src="(.+?)"/g, (m, id,text, href) => {
            contents.push({id, title: entity2unicode(text),href});
            return '';
        })
        return {
            title: m1 ? entity2unicode((m1[1])) : 'Unknown Title',
            author: m2 ? entity2unicode((m2[1])) : '',
            contents
        };        
    }
   
}