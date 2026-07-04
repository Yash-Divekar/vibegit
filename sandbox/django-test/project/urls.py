from django.urls import path
from django.contrib.auth import views as auth_views
from .views import RegistrationView

urlpatterns = [
    path('login/', auth_views.LoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('register/', RegistrationView.as_view(), name='register'),  # Custom registration view
]