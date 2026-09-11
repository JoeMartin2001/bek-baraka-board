`three.iife.js` — Three.js r186 bundled to a classic script.

Three ships ES-module only, and ES modules do not load over `file://`, which is
how the shop opens the board. Rebuilt with:

    npm i three esbuild
    echo "export * from 'three';
          export { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';" > entry.js
    npx esbuild --bundle --format=iife --global-name=THREE --minify entry.js --outfile=three.iife.js

build.sh inlines it, so index.html stays one self-contained file.
