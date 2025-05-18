from django.contrib import admin
from .models import Manager, Player, Notice, Update, Resource

@admin.register(Manager)
class ManagerAdmin(admin.ModelAdmin):
    list_display = ('rank', 'nickname', 'club_value', 'team_color', 'score', 'formation', 'created_at')
    ordering = ('rank',)

@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('rank', 'nickname', 'team_color', 'position', 'player_name', 'season', 'grade', 'created_at')
    ordering = ('rank', 'position')

admin.site.register(Notice)
admin.site.register(Update)
admin.site.register(Resource)

# Register your models here.
