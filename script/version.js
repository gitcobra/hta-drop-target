import { readFileSync, writeFileSync } from 'fs';


// load the json object

let path = new URL('version.json', import.meta.url).pathname.substring(1);
let txt = readFileSync(path);
const Ver = JSON.parse(txt);
// update the build number
Ver.build++;
writeFileSync( path, JSON.stringify(Ver, null, '  ') );

// update the version field in package.json
path = new URL('../package.json', import.meta.url).pathname.substring(1);
txt = readFileSync(path);
const Package = JSON.parse(txt);
Package.version = `${Ver.major}.${Ver.minor}.${String(Ver.build)}${Ver.tag}`;
writeFileSync( path, JSON.stringify(Package, null, '  ') );
