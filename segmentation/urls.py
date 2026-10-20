from django.urls import path
from . import views

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("analysis/", views.upload_mri, name="upload_mri"),
    path("prediction/<int:pk>/", views.prediction_detail, name="prediction_detail"),
    path("prediction/<int:pk>/delete/", views.prediction_delete, name="prediction_delete"),
    path("history/", views.prediction_history, name="prediction_history"),
    path("about/", views.about_model, name="about_model"),
]