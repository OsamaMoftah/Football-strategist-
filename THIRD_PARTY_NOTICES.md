# Third-party models and media

The root MIT license applies to original Football strategist code. It does not relicense the following assets.

| Asset | Source | Terms / local notice |
| --- | --- | --- |
| Person detector | [onnx-community/rfdetr_nano-ONNX](https://huggingface.co/onnx-community/rfdetr_nano-ONNX), revision `eae21cee0687a91bcf9fa071605c48d7705d2d91` | Apache-2.0; [notice](public/models/rfdetr-nano/NOTICE.txt), [license](public/models/rfdetr-nano/LICENSE.txt) |
| Football ball detector | [build-small-hackathon/futheros-ball-rfdetr](https://huggingface.co/build-small-hackathon/futheros-ball-rfdetr), revision `d4dfe1076a9ef09d5326c30997d03926974ea757` | Apache-2.0; [notice](public/models/football-ball/NOTICE.txt), [license](public/models/football-ball/LICENSE.txt) |
| ONNX Runtime Web | [Microsoft ONNX Runtime](https://github.com/microsoft/onnxruntime) | MIT; [bundled license](public/ort/LICENSE.txt) |
| Goal by Rafael Leao | [Saggittarius A / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Goal_by_Rafael_Leao.webm), 23 April 2023 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); original source unchanged, annotations added. Annotated demo derivatives retain CC BY-SA 4.0. |
| U17 New Zealand vs Canada (native case) | [NaBUru38 / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:2018_FIFA_U-17_Women%27s_World_Cup_-_New_Zealand_vs_Canada_-_21.webm), author's own work | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). First 20.02 seconds, transcoded H.264, audio removed. Annotated MP4 derivative also CC BY-SA 4.0. See [case manifest](public/demo/u17/README.md). |
| Optional local event-proposal model | [Qwen3-VL-4B-Instruct](https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct), via official Ollama `qwen3-vl:4b-instruct` | Apache-2.0; weights are downloaded separately, not bundled. Digest and model outputs recorded in the native case. No successful event extraction is claimed. |
| Editorial photographs | Waldemar Brandt, Christopher Lemercier, David Vives, Leo_Visions / Unsplash | [Source links and credits](public/images/credits.txt); [Unsplash License](https://unsplash.com/license) |
| Jost / Karla | Google Fonts distributions bundled through Next.js | SIL Open Font License; preserve package notices when redistributing fonts |

The football checkpoint is the published `checkpoint_best_total.pth`. This project does not claim it is a later model described in its upstream README, and does not repeat upstream accuracy claims as its own. The exported model is dynamically quantized for the browser; see `pipeline/export_ball_model.py` and the recorded checksum.

Dependency licenses remain with their respective authors. A model's published license is not a guarantee about every training-data right or suitability for a particular operation. The included demo's media terms do not apply to users' independent source footage.

The optional native server installs FastAPI, Uvicorn, HTTPX, OpenCV, NumPy, SciPy and ONNX Runtime from pinned Python distributions. These retain their package licenses. FFmpeg is installed from Debian packages with its distribution copyright/license files; it is not relicensed under the application's MIT license.
