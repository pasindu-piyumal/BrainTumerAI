
from functools import lru_cache
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image


# --------------------------------------------------
# Configuration
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent

MODEL_PATH = (
    PROJECT_ROOT
    / "models"
    / "segmentation"
    / "unet_augmented_best.keras"
)

IMG_SIZE = (256, 256)
THRESHOLD = 0.40


# --------------------------------------------------
# Load the trained model once
# --------------------------------------------------

class PatchedConv2DTranspose(tf.keras.layers.Conv2DTranspose):
    """Custom layer to gracefully handle legacy 'groups' argument from Keras 2."""
    def __init__(self, *args, **kwargs):
        kwargs.pop("groups", None)
        super().__init__(*args, **kwargs)


@lru_cache(maxsize=1)
def load_model():
    """Load the existing trained U-Net model once."""

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Trained model not found: {MODEL_PATH}"
        )

    custom_objects = {"Conv2DTranspose": PatchedConv2DTranspose}

    try:
        model = tf.keras.models.load_model(
            MODEL_PATH,
            compile=False,
            custom_objects=custom_objects,
        )
    except Exception:
        # If the file was saved as HDF5 under a .keras extension, Keras 3 requires .h5 filename
        h5_cache_path = MODEL_PATH.with_suffix(".h5")
        if not h5_cache_path.exists():
            import shutil
            shutil.copyfile(MODEL_PATH, h5_cache_path)

        model = tf.keras.models.load_model(
            h5_cache_path,
            compile=False,
            custom_objects=custom_objects,
        )

    print("BrainTumorAI U-Net model loaded.")
    print("Model input shape:", model.input_shape)
    print("Model output shape:", model.output_shape)

    return model


# --------------------------------------------------
# MRI preprocessing and segmentation
# --------------------------------------------------

def predict_mri(image_file):
    """
    Predict a tumor segmentation mask and create an overlay.

    Returns:
        mask: PIL grayscale binary mask
        overlay: PIL RGB image with red segmentation overlay
        predicted_tumor_pixels: number of positive mask pixels
        threshold: prediction threshold used
    """

    # 1. Open the MRI and convert it to grayscale.
    with Image.open(image_file) as image:
        original = image.convert("L")

    original_array = np.asarray(original)

    # 2. Convert the image to a TensorFlow tensor.
    tensor = tf.convert_to_tensor(
        original_array[..., np.newaxis]
    )

    # 3. Resize with padding to preserve aspect ratio.
    tensor = tf.image.resize_with_pad(
        tensor,
        IMG_SIZE[0],
        IMG_SIZE[1],
        method="bilinear",
    )

    # 4. Normalize pixel values to [0, 1].
    tensor = tf.cast(tensor, tf.float32) / 255.0

    # Add the batch dimension.
    tensor = tensor[tf.newaxis, ...]

    # 5. Run the trained U-Net.
    model = load_model()
    prediction_batch = model.predict(tensor, verbose=0)

    if prediction_batch is None:
        raise RuntimeError("The model returned no prediction.")

    if prediction_batch.ndim != 4:
        raise ValueError(
            f"Unexpected prediction shape: {prediction_batch.shape}"
        )

    if prediction_batch.shape[-1] != 1:
        raise ValueError(
            "Expected a single-channel segmentation output, "
            f"but received {prediction_batch.shape}."
        )

    prediction = prediction_batch[0, :, :, 0]

    # 6. Convert probabilities to a binary mask.
    mask = (prediction >= THRESHOLD).astype(np.uint8)

    # 7. Convert the preprocessed MRI to a display image.
    display_array = (
        tensor[0, :, :, 0].numpy() * 255.0
    ).clip(0, 255).astype(np.uint8)

    display_image = Image.fromarray(display_array, mode="L")

    # 8. Create the grayscale segmentation mask.
    mask_image = Image.fromarray(mask * 255, mode="L")

    # 9. Create a red transparent overlay over predicted pixels.
    base_image = display_image.convert("RGBA")

    red_layer_array = np.zeros(
        (IMG_SIZE[0], IMG_SIZE[1], 4),
        dtype=np.uint8,
    )

    red_layer_array[mask == 1] = [255, 30, 60, 115]

    red_layer = Image.fromarray(
        red_layer_array,
        mode="RGBA",
    )

    overlay = Image.alpha_composite(
        base_image,
        red_layer,
    ).convert("RGB")

    # 10. Return results for Django.
    result = {
        "mask": mask_image,
        "overlay": overlay,
        "predicted_tumor_pixels": int(mask.sum()),
        "threshold": THRESHOLD,
    }

    print("MRI segmentation completed.")
    print("Prediction shape:", prediction.shape)
    print("Predicted tumor pixels:", result["predicted_tumor_pixels"])
    print("Threshold:", result["threshold"])

    return result
