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
    rank = models.PositiveIntegerField()
    nickname = models.CharField(max_length=64)
    team_color = models.CharField(max_length=64)
    position = models.CharField(max_length=16)  # 포지션명
    player_name = models.CharField(max_length=64)  # 선수 이름
    season = models.CharField(max_length=64)  # 시즌명
    grade = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.manager.nickname} - {self.player_name} ({self.position})"

class PlayerTemp(models.Model):
    manager = models.ForeignKey(Manager, on_delete=models.CASCADE, related_name='players_temp')
    rank = models.PositiveIntegerField()
    nickname = models.CharField(max_length=64)
    team_color = models.CharField(max_length=64)
    position = models.CharField(max_length=16)
    player_name = models.CharField(max_length=64)
    season = models.CharField(max_length=64)
    grade = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.manager.nickname} - {self.player_name} ({self.position})"

class Notice(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    date = models.DateField(auto_now_add=True)

class Update(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    date = models.DateField(auto_now_add=True)

class Resource(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    url = models.URLField()
    date = models.DateField(auto_now_add=True)
    type = models.CharField(max_length=50, default='PDF')
    size = models.CharField(max_length=20, default='0MB')
    downloads = models.PositiveIntegerField(default=0)

class ManagerTemp(models.Model):
    rank = models.PositiveIntegerField()
    nickname = models.CharField(max_length=100)
    club_value = models.BigIntegerField()
    team_color = models.CharField(max_length=100)
    formation = models.CharField(max_length=50)
    score = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.rank}위 {self.nickname} ({self.team_color})"
