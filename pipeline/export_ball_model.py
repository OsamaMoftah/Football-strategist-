"""Reproduce the Apache-2.0 football model used by the browser.

Install rfdetr==1.11.2, torch, onnx, onnxscript and onnxruntime in an isolated env.
Download checkpoint_best_total.pth from the revision in public/models/football-ball/NOTICE.txt.
Usage: python pipeline/export_ball_model.py CHECKPOINT OUTPUT_DIRECTORY
Checkpoint loading uses RF-DETR's safe weights-only loader.
"""
import argparse
from pathlib import Path
from rfdetr import RFDETRNano
from onnxruntime.quantization import QuantType, quantize_dynamic

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('checkpoint', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    model = RFDETRNano.from_checkpoint(str(args.checkpoint), device='cpu')
    model.export(output_dir=str(args.output), shape=(384, 384), verbose=False, fp16=False)
    quantize_dynamic(str(args.output/'rfdetr-nano.onnx'), str(args.output/'model.onnx'),
                     weight_type=QuantType.QUInt8, per_channel=True, op_types_to_quantize=['MatMul'])
