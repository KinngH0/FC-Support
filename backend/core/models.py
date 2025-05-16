from django.db import models

class Manager(models.Model):
    rank = models.PositiveIntegerField()
    nickname = models.CharField(max_length=100)
    club_value = models.BigIntegerField()
    team_color = models.CharField(max_length=100)
    formation = models.CharField(max_length=50)
    score = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.rank}위 {self.nickname} ({self.team_color})"

class Player(models.Model):
    manager = models.ForeignKey(Manager, on_delete=models.CASCADE, related_name='players')
    match_id = models.CharField(max_length=32)
    position_id = models.PositiveIntegerField()
    spid = models.BigIntegerField()
    season_id = models.PositiveIntegerField()
    grade = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.manager.nickname} - {self.spid} (포지션 {self.position_id})"
