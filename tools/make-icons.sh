#!/bin/sh
# Renders all icons/splashes from tools/icon.html. Needs the dev server running (npm run serve).
set -e
cd "$(dirname "$0")/.."
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
PROF="$(mktemp -d)"
shot() { # out w h query
  "$CHROME" --headless=new --user-data-dir="$PROF" --hide-scrollbars --window-size=$2,$3 --screenshot="$(pwd -W)/$1" "http://localhost:8123/tools/icon.html?$4" 2>/dev/null
}
shot icons/icon-512.png 512 512 "s=512"
shot icons/icon-192.png 192 192 "s=192"
RES=android/app/src/main/res
for d in mdpi:48:108 hdpi:72:162 xhdpi:96:216 xxhdpi:144:324 xxxhdpi:192:432; do
  n=${d%%:*}; rest=${d#*:}; s=${rest%%:*}; f=${rest#*:}
  shot $RES/mipmap-$n/ic_launcher.png $s $s "s=$s"
  shot $RES/mipmap-$n/ic_launcher_round.png $s $s "s=$s"
  shot $RES/mipmap-$n/ic_launcher_foreground.png $f $f "s=$f&k=0.62"
done
shot $RES/drawable/splash.png 1080 1920 "w=1080&h=1920&k=0.5"
for d in $RES/drawable-port-*; do cp $RES/drawable/splash.png $d/splash.png; done
shot $RES/drawable-land-mdpi/splash.png 1920 1080 "w=1920&h=1080&k=0.5"
for d in $RES/drawable-land-*; do cp $RES/drawable-land-mdpi/splash.png $d/splash.png 2>/dev/null || true; done
rm -rf "$PROF"
echo icons done
