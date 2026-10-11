#!/bin/bash
# 경고 방송 음성(로봇 스피커) — macOS 음성 Yuna(한국어) + Ava Premium(영어) → assets/warning.mp3 → src/audio.ts(base64)
# 문구를 바꾸면 이 스크립트를 다시 돌린다. 필요: say(macOS) · ffmpeg
set -euo pipefail
cd "$(dirname "$0")/.."
T=$(mktemp -d)
say -v Yuna -r 175 -o "$T/ko.aiff" "경고합니다. 이곳은 공항 보호구역입니다. 즉시 멈추고, 그 자리에서 기다리십시오. 위치가 관계기관에 통보되었습니다."
say -v "Ava (Premium)" -r 170 -o "$T/en.aiff" "Warning. This is a restricted airport area. Stop, and stay where you are."
ffmpeg -loglevel error -y -i "$T/ko.aiff" -f lavfi -t 0.6 -i anullsrc=r=22050:cl=mono -i "$T/en.aiff" \
  -filter_complex "[0:a]aresample=22050,aformat=channel_layouts=mono[a0];[1:a]aformat=channel_layouts=mono[a1];[2:a]aresample=22050,aformat=channel_layouts=mono[a2];[a0][a1][a2]concat=n=3:v=0:a=1,loudnorm=I=-14:TP=-1.5[out]" \
  -map "[out]" -ar 22050 -ac 1 -b:a 48k assets/warning.mp3
{ echo "// 생성물 — scripts/build_audio.sh 가 만든다(손으로 고치지 않는다). 경고 방송 mp3(base64)"; printf 'export const WARNING_MP3 = "'; base64 < assets/warning.mp3 | tr -d '\n'; echo '";'; } > src/audio.ts
rm -rf "$T"; echo "src/audio.ts 갱신"
