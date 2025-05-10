# chromium-downloader (@na-trium-144/crdl)
Download any version of chromium on Linux, MacOS and Windows.

Downloaded files will be in `$HOME/.crdl`.

example for chromium version 111
```
npx @na-trium-144/crdl 111
```

## How it works

1. Get position number for given chromium version in https://chromiumdash.appspot.com/branches
2. Get chromium from https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html
3. If not found, it tries \[position-100, position+100\]

See also https://www.chromium.org/getting-involved/download-chromium/
