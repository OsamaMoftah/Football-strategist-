# U17 native-engine case

Source: **2018 FIFA U-17 Women's World Cup — New Zealand vs Canada — 21**, by **NaBUru38**, author's own work, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:2018_FIFA_U-17_Women%27s_World_Cup_-_New_Zealand_vs_Canada_-_21.webm).

License: [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/). `source.mp4` is the first 600 frames (20.02 seconds), transcoded to H.264 with audio removed. `annotated.mp4` adds tracking marks, captions and attribution; this adapted video is distributed under CC BY-SA 4.0. Original application code remains MIT. No local Bundesliga footage is included.

| File | Meaning |
| --- | --- |
| `source.mp4` | Rights-cleared, silent source excerpt, 1280×720, 30000/1001 FPS |
| `analysis.json` | Native inference plus explicit reviewed exclusions and visual-review notes |
| `raw-ball-track.json` | All 500 retained points before review, including the false advertising-ball segment |
| `review.json` | Source-hash-bound exclusion and three implementation-agent coaching notes |
| `labels.json`, `evaluation.json` | Small overlay-assisted spot check; not independent ground truth or benchmark accuracy |
| `vlm-full-sequence.json` | 11 sampled images; Qwen3-VL returned zero supported events |
| `vlm-window.json`, `vlm-response.json` | Five sampled images at 6–10s, model digest, prompt, hashes and zero-event response |
| `annotated.mp4` | Native renderer output, 600 frames, H.264, silent |

Native runtime: 242.6 seconds for 600 source frames on Apple M5 CPU inference. Before review: 478 detector anchors and 22 appearance estimates, five retained segments. Review removed segment 5 (21 points, 9.409–10.143s) that followed a printed football on an advert. After review: 479 points, four segments; longest segment 9.009s. Counts are coverage/continuity, not correctness.

The visual spot check used ten source frames spaced 60 frames apart. Eight were labeled visible and two ambiguous. Seven visible samples had a retained point within 12 source pixels; one was missed. Labels are approximate (+/-3 px), implementation-agent-created and overlay-assisted after development. They do not establish general precision/recall, independent localization accuracy or commercial readiness.

Reproduction commands and remaining limitations: [native engine](../../../docs/NATIVE_ENGINE.md).
