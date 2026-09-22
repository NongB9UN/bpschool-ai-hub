import {cpSync,mkdirSync} from 'node:fs';
mkdirSync('public',{recursive:true});
for(const file of ['index.html','admin.html','css','js']) cpSync(file,`public/${file}`,{recursive:true});

