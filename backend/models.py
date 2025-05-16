from django.db import models

class Manager(models.Model):
    rank = models.IntegerField()
    nickname = models.CharField(max_length=100)
    club_value = models.BigIntegerField()
    team_color = models.CharField(max_length=100)
    formation = models.CharField(max_length=50)
    score = models.IntegerField()
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['rank']
        indexes = [
            models.Index(fields=['rank']),
            models.Index(fields=['nickname']),
            models.Index(fields=['recorded_at']),
        ]

    def __str__(self):
        return f"{self.rank}위 {self.nickname}"
