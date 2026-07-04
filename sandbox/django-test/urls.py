from django.urls import path
from .views import ItemView

urlpatterns = [
    path('items/', ItemView.as_view()),  # For listing and creating
    path('items/<int:item_id>/', ItemView.as_view()),  # For retrieving, updating, and deleting
]