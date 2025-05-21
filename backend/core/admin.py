from django.contrib import admin
from .models import Manager, Player, Notice, Update, Resource, Review

@admin.register(Manager)
class ManagerAdmin(admin.ModelAdmin):
    list_display = ('rank', 'nickname', 'club_value', 'team_color', 'score', 'formation', 'created_at')
    ordering = ('rank',)

@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('rank', 'nickname', 'team_color', 'position', 'player_name', 'season', 'grade', 'created_at')
    ordering = ('rank', 'position')

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = (
        'spid', 'season_id', 'season_name', 'player_name', 'upgrade_level', 'teamcolor', 'position',
        'name', 'password', 'score', 'review', 'good', 'bad', 'ip', 'created_at'
    )
    search_fields = ('spid', 'season_id', 'name', 'review')
    list_filter = ('season_id', 'score')

admin.site.register(Notice)
admin.site.register(Update)
admin.site.register(Resource)

# Register your models here.
