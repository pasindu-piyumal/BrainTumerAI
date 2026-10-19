from django import forms
from django.core.exceptions import ValidationError
from PIL import Image

class MRIUploadForm(forms.Form):
    mri_image = forms.ImageField(
        label='Upload Brain MRI Image',
        help_text='Upload a brain MRI image in JPG, JPEG, or PNG format.',
        widget=forms.FileInput(attrs={
            'accept': '.jpg,.jpeg,.png,image/jpeg,image/png',
            'id': 'mri-file-input',
            'class': 'file-input-hidden'
        })
    )

    def clean_mri_image(self):
        image = self.cleaned_data.get('mri_image')
        if not image:
            raise ValidationError("Please select an MRI image file to upload.")

        # Check maximum file size (15MB limit)
        max_size = 15 * 1024 * 1024
        if image.size > max_size:
            raise ValidationError("File size exceeds 15MB. Please upload a smaller MRI scan.")

        # Validate file extension
        valid_extensions = ('.jpg', '.jpeg', '.png')
        filename = image.name.lower()
        if not any(filename.endswith(ext) for ext in valid_extensions):
            raise ValidationError("Unsupported file extension. Only JPG, JPEG, and PNG are allowed.")

        # Validate image content using Pillow
        try:
            image_copy = Image.open(image)
            image_copy.verify()
            if image_copy.format not in ['JPEG', 'PNG']:
                raise ValidationError("File content is not a valid JPEG or PNG image.")
        except Exception:
            raise ValidationError("Uploaded file is corrupted or not a valid image.")

        # Reset file pointer after verify
        image.seek(0)
        return image