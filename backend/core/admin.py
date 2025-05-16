from django.contrib import admin
from .models import Manager, Player

@admin.register(Manager)
class ManagerAdmin(admin.ModelAdmin):
    list_display = ('rank', 'nickname', 'club_value', 'team_color', 'score', 'formation', 'created_at')
    ordering = ('rank',)

@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('manager', 'match_id', 'position_id', 'spid', 'season_id', 'grade', 'created_at')
    ordering = ('manager', 'position_id')

# Register your models here.
