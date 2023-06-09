import fs from "fs";

// typescript
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

// clearn up tools
import del from "rollup-plugin-delete";
import cleanup from "rollup-plugin-cleanup";
import strip from "@rollup/plugin-strip";


// development flag
const DEV = !!process.env.ROLLUP_WATCH;
const BUILD_DEV = !!process.env.NODE_BUILD_DEV;
const RELEASE = !!process.env.NODE_BUILD_RELEASE;

// destination
const dist = `${RELEASE ? 'release' : 'dist'}${BUILD_DEV ? '/dev' : ''}`;
// entry file
const entryFilePath = `./src/hta-drop-target.ts`;
const entryDtsPath = `./${dist}/dts/hta-drop-target.d.ts`;
// output formats
const formats = ['iife', 'es'];
// global name for the constructor
const GLOBAL_NAME = 'HtaDropTarget';
// bundle file namey
const bundleName = `hta-drop-target`;



// sites
const GITHUB_URL = 'https://github.com/gitcobra/hta-drop-target';
// banner
let BANNER_TXT = '';
if( !DEV ) {
  const Ver = JSON.parse(fs.readFileSync('./script/version.json'));
  const VERSION_TXT = `${Ver.major}.${Ver.minor}.${String(Ver.build)}${Ver.tag}`;

  BANNER_TXT = `/*
  title: ${bundleName}
  version: ${VERSION_TXT}
  github: ${GITHUB_URL}
*/`;
}


const BuildConfig = [];
formats.forEach(format => {
  const formatFileName = format === 'es' ? 'esm' : format;
  const baseFileName = `${dist}/${bundleName}${format !== 'iife' ? '.' + formatFileName : ''}`;

  BuildConfig.push({
    input: [entryFilePath],

    output: {
      format: format,
      file: `${baseFileName}.js`,
      name: GLOBAL_NAME,
      sourcemap: false,
      esModule: false,
      banner: BANNER_TXT
    },

    plugins: [
      ...!DEV ? [del({
        targets: [`${baseFileName}.*`, `${dist}/dts`],
        hook: 'buildStart',
        verbose: true
      }),] : [],

      typescript({
        "exclude": ["./test/*.ts"],
        "compilerOptions": {
          "declaration": true,
          //"outDir": "tmp",
          "declarationDir": "dts",
          
          "noUnusedParameters": false,
          "noUnusedLocals": false,
        },
      }),


      // remove DEV blocks
      ...!(DEV || BUILD_DEV) ? [
        strip({
          include: ["**/*.js", "**/*.ts"],
          labels: ["DEV"],
        }),
        cleanup()
      ] : [],
    ],
    onwarn: suppress_warnings,
    //watch: {clearScreen: false},
  }, {
  // bundle d.ts files
    input: [
      entryDtsPath
    ],
    output: [
      { file: `${dist}/${bundleName}${format !== 'iife' ? '.' + formatFileName : ''}.d.ts` },
    ],

    plugins: [
      dts({respectExternal:true}),
      
      ...!DEV ? [del({
        targets: [`${dist}/dts`],
        hook: 'buildEnd'
      })] : [],
    ]
    //watch: {clearScreen: false},
  });
});


// for test folder's ts files. they are output to the same folder.
if( DEV ) {
  const TEST_SRC = './test/';
  const externalPackagePath = `../dist/${bundleName}.esm`;
  const externalPackageAbsolutePath = new URL(TEST_SRC + externalPackagePath, import.meta.url).pathname.substring(1).replace(/\//g, '\\');
  
  // create output settings for each file in the test folder
  fs.readdirSync(TEST_SRC).forEach(async (file) => {
    if( !fs.statSync(TEST_SRC + file).isFile() || !/\.ts$/i.test(file) )
      return;
    
    BuildConfig.push({
      input: [TEST_SRC + file],
      external: [externalPackagePath],
      output: {
        format: "iife",
        dir: './test',
        sourcemap: false,
        globals: {
          [externalPackageAbsolutePath]: GLOBAL_NAME,
        },
      },

      plugins: [
        typescript({
          "compilerOptions": {
            "declaration": false,
            "noUnusedParameters": false,
            "noUnusedLocals": false,
          }
        }),
      ],
      
      onwarn: suppress_warnings,
      watch: {clearScreen: false},
    });
  });
}

export default BuildConfig;




function suppress_warnings(warning, defaultHandler) {
  if (warning.code === 'THIS_IS_UNDEFINED')
    return;
  
  defaultHandler(warning);
}
