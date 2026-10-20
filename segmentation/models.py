from django.db import models

class MRIPrediction(models.Model):
    uploaded_image = models.ImageField(
        upload_to='mri_uploads/'
    )

    segmentation_overlay = models.ImageField(
        upload_to='segmentation_results/',
        blank=True,
        null=True
    )

    segmentation_mask = models.ImageField(
        upload_to="segmentation_results/",
        blank=True,
        null=True
    )

    predicted_tumor_pixels = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    threshold = models.FloatField(
        default=0.40
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'MRI Prediction #{self.id} - {self.created_at.strftime("%Y-%m-%d %H:%M")}'

    @property
    def has_tumor(self):
        return bool(self.predicted_tumor_pixels and self.predicted_tumor_pixels > 0)

    @property
    def tumor_percentage(self):
        if self.predicted_tumor_pixels is not None:
            return round((self.predicted_tumor_pixels / (256 * 256)) * 100, 2)
        return 0.0

    def delete(self, *args, **kwargs):
        if self.uploaded_image:
            self.uploaded_image.delete(save=False)
        if self.segmentation_overlay:
            self.segmentation_overlay.delete(save=False)
        if self.segmentation_mask:
            self.segmentation_mask.delete(save=False)
        super().delete(*args, **kwargs)

