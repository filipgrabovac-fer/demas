from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from main.views.enhanced_data import EnhancedDataView
from main.views.original_data import OriginalDataView



router = DefaultRouter()
router.register(r'original-data', OriginalDataView, basename='original-data')
router.register(r'enhanced-data', EnhancedDataView, basename='enhanced-data')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    path('api/', include(router.urls)),
]