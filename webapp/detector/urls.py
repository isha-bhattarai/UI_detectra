from django.urls import path
from . import views

app_name = "detector"

urlpatterns = [
    path("",                        views.upload_view,          name="upload"),
    path("upload/image/",           views.upload_image_view,    name="upload_image"),
    path("result/<int:pk>/",        views.result_view,          name="result"),
    path("result/<int:pk>/report/", views.download_report_view, name="download_report"),
    path("history/",                views.history_view,         name="history"),
    path("how-it-works/",           views.how_it_works_view,    name="how_it_works"),
    path("model/",                  views.model_view,           name="model"),
    path("reports/",                views.reports_view,         name="reports"),
    path("settings/",               views.settings_view,        name="settings"),
    path("help/",                   views.help_view,            name="help"),
]