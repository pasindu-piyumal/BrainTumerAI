
from pathlib import Path
from segmentation.inference import predict_mri

PROJECT_ROOT = Path(__file__).resolve().parent

# Find an existing uploaded MRI image.
mri_folder = PROJECT_ROOT / "media" / "mri_uploads"
images = [
    p for p in mri_folder.iterdir()
    if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg"}
] if mri_folder.exists() else []

if not images:
    raise FileNotFoundError(
        f"No MRI images found in {mri_folder}. "
        "Upload an MRI through Django first."
    )

test_image = images[0]
print("Testing image:", test_image)

with test_image.open("rb") as image_file:
    result = predict_mri(image_file)

assert result is not None, "predict_mri returned None"
assert result["mask"] is not None
assert result["overlay"] is not None

output_dir = PROJECT_ROOT / "outputs" / "inference_test"
output_dir.mkdir(parents=True, exist_ok=True)

result["mask"].save(output_dir / "predicted_mask.png")
result["overlay"].save(output_dir / "predicted_overlay.png")

print("Mask size:", result["mask"].size)
print("Overlay size:", result["overlay"].size)
print("Predicted tumor pixels:", result["predicted_tumor_pixels"])
print("Threshold:", result["threshold"])
print("Mask saved to:", output_dir / "predicted_mask.png")
print("Overlay saved to:", output_dir / "predicted_overlay.png")
print("INFERENCE TEST PASSED")
