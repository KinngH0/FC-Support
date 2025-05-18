from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'notices', views.NoticeViewSet)
router.register(r'updates', views.UpdateViewSet)
router.register(r'resources', views.ResourceViewSet)

urlpatterns = [
    # ... existing urls ...
    path('api/player/', views.player_list, name='player_list'),
    path('api/pick-rate/', views.get_pick_rate, name='pick-rate'),
    path('api/base-date/', views.get_base_date, name='base-date'),
    path('api/team-color-stats/', views.get_team_color_stats, name='team-color-stats'),
    path('api/', include(router.urls)),
] 