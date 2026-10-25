from pathlib import Path
from segmentation.inference import load_model

model = load_model()

print("Model input: ", model.input_shape)
print("Model output:", model.output_shape)

assert model.input_shape == (None, 256, 256, 1)
assert model.output_shape == (None, 256, 256, 1)

print('Django model integration check passed.')