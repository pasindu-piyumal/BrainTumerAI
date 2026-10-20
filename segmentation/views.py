import json
from io import BytesIO
from django.core.files.base import ContentFile
from django.core.paginator import Paginator
from django.contrib import messages
from django.db.models import Avg, Count
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_POST

from .forms import MRIUploadForm
from .inference import predict_mri, THRESHOLD
from .models import MRIPrediction


def image_to_content_file(image):
    """Convert a PIL image to a Django ContentFile."""
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return ContentFile(buffer.getvalue())


def dashboard(request):
    """
    Overview Dashboard displaying real database metrics, recent scans,
    and visual analytics powered by actual historical records.
    """
    total_scans = MRIPrediction.objects.count()
    positive_scans = MRIPrediction.objects.filter(predicted_tumor_pixels__gt=0).count()
    negative_scans = MRIPrediction.objects.filter(predicted_tumor_pixels=0).count()
    pending_or_unprocessed = MRIPrediction.objects.filter(predicted_tumor_pixels__isnull=True).count()

    avg_tumor_pixels_agg = (
        MRIPrediction.objects.filter(predicted_tumor_pixels__gt=0)
        .aggregate(Avg("predicted_tumor_pixels"))
    )
    avg_tumor_pixels = round(avg_tumor_pixels_agg["predicted_tumor_pixels__avg"] or 0)

    latest_prediction = MRIPrediction.objects.first()
    recent_predictions = MRIPrediction.objects.all()[:6]

    # Calculate real distribution data for charts
    small_tumors = MRIPrediction.objects.filter(
        predicted_tumor_pixels__gt=0, predicted_tumor_pixels__lte=500
    ).count()
    medium_tumors = MRIPrediction.objects.filter(
        predicted_tumor_pixels__gt=500, predicted_tumor_pixels__lte=1500
    ).count()
    large_tumors = MRIPrediction.objects.filter(
        predicted_tumor_pixels__gt=1500
    ).count()

    # Timeline / recent scans pixel distribution (last 10 scans)
    chronological_scans = list(MRIPrediction.objects.order_by("created_at")[:12])
    chart_timeline_labels = [f"#{p.id}" for p in chronological_scans]
    chart_timeline_values = [p.predicted_tumor_pixels or 0 for p in chronological_scans]

    context = {
        "active_nav": "dashboard",
        "total_scans": total_scans,
        "positive_scans": positive_scans,
        "negative_scans": negative_scans,
        "pending_scans": pending_or_unprocessed,
        "avg_tumor_pixels": avg_tumor_pixels,
        "latest_prediction": latest_prediction,
        "recent_predictions": recent_predictions,
        "chart_data": {
            "distribution": [negative_scans, small_tumors, medium_tumors, large_tumors],
            "timeline_labels": chart_timeline_labels,
            "timeline_values": chart_timeline_values,
        },
        "default_threshold": THRESHOLD,
    }
    return render(request, "segmentation/dashboard.html", context)


def upload_mri(request):
    """
    Handle MRI image upload, execute U-Net segmentation, save output images,
    and redirect to the interactive results workspace.
    """
    if request.method == "POST":
        form = MRIUploadForm(request.POST, request.FILES)
    else:
        form = MRIUploadForm()
    context = {
        "active_nav": "upload",
        "form": form,
        "default_threshold": THRESHOLD,
    }

    if request.method == "POST" and form.is_valid():
        try:
            uploaded_file = form.cleaned_data["mri_image"]

            # Save the original MRI and create a database record
            prediction_record = MRIPrediction.objects.create(
                uploaded_image=uploaded_file
            )

            # Run the existing trained U-Net model
            with prediction_record.uploaded_image.open("rb") as image_file:
                result = predict_mri(image_file)

            # Save segmentation overlay
            prediction_record.segmentation_overlay.save(
                f"prediction_{prediction_record.pk}_overlay.png",
                image_to_content_file(result["overlay"]),
                save=False,
            )

            # Save segmentation mask
            prediction_record.segmentation_mask.save(
                f"prediction_{prediction_record.pk}_mask.png",
                image_to_content_file(result["mask"]),
                save=False,
            )

            prediction_record.predicted_tumor_pixels = result["predicted_tumor_pixels"]
            prediction_record.threshold = result["threshold"]
            prediction_record.save()

            messages.success(request, f"MRI Scan #{prediction_record.pk} successfully analyzed.")
            return redirect("prediction_detail", pk=prediction_record.pk)

        except Exception as exc:
            context["error"] = f"Could not process the MRI image: {exc}"

    return render(request, "segmentation/upload.html", context)


def prediction_detail(request, pk):
    """
    Interactive results workspace for a specific MRI prediction record.
    Provides comparison slider, zoom/pan, channel tabs, and quantitative stats.
    """
    prediction = get_object_or_404(MRIPrediction, pk=pk)

    context = {
        "active_nav": "detail",
        "prediction": prediction,
        "default_threshold": THRESHOLD,
    }
    return render(request, "segmentation/detail.html", context)


def prediction_history(request):
    """
    Searchable, filterable, and paginated archive of all MRI predictions.
    """
    queryset = MRIPrediction.objects.all()

    # Search by Scan ID or date query
    search_query = request.GET.get("q", "").strip()
    if search_query:
        if search_query.isdigit():
            queryset = queryset.filter(id=int(search_query))
        else:
            queryset = queryset.filter(created_at__icontains=search_query)

    # Filter by classification status
    status_filter = request.GET.get("status", "all")
    if status_filter == "positive":
        queryset = queryset.filter(predicted_tumor_pixels__gt=0)
    elif status_filter == "negative":
        queryset = queryset.filter(predicted_tumor_pixels=0)

    # Sorting
    sort_by = request.GET.get("sort", "newest")
    if sort_by == "oldest":
        queryset = queryset.order_by("created_at")
    elif sort_by == "pixels_desc":
        queryset = queryset.order_by("-predicted_tumor_pixels")
    elif sort_by == "pixels_asc":
        queryset = queryset.order_by("predicted_tumor_pixels")
    else:  # newest
        queryset = queryset.order_by("-created_at")

    # Pagination: 8 records per page
    paginator = Paginator(queryset, 8)
    page_number = request.GET.get("page", 1)
    page_obj = paginator.get_page(page_number)

    context = {
        "active_nav": "history",
        "page_obj": page_obj,
        "search_query": search_query,
        "status_filter": status_filter,
        "sort_by": sort_by,
        "total_records": queryset.count(),
    }
    return render(request, "segmentation/history.html", context)


@require_POST
def prediction_delete(request, pk):
    """
    Safely delete a prediction record and its associated media files with CSRF protection.
    """
    prediction = get_object_or_404(MRIPrediction, pk=pk)
    scan_id = prediction.pk
    prediction.delete()
    messages.success(request, f"Scan #{scan_id} and associated files were successfully deleted.")
    return redirect("prediction_history")


def about_model(request):
    """
    Detailed information on the U-Net architecture, training process,
    preprocessing pipeline, thresholds, and clinical research disclaimers.
    """
    context = {
        "active_nav": "about",
        "default_threshold": THRESHOLD,
        "total_records": MRIPrediction.objects.count(),
    }
    return render(request, "segmentation/about.html", context)
