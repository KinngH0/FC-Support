from django.apps import AppConfig
import threading
import datetime
import time
from django.db.utils import OperationalError

def should_crawl():
    from core.models import Manager
    # 데이터가 없으면 True
    return Manager.objects.count() == 0

def crawl_once():
    from django.core.management import call_command
    try:
        call_command('crawl_managers')
    except Exception as e:
        print(f"[크롤링] 자동 크롤링 실패: {e}")

def crawl_scheduler():
    # 서버 시작 시 1회
    if should_crawl():
        # 최초 실행은 바로 크롤링하지 않고, 아래에서 batch 로그 전에 실행
        pass
    # 이후 정각+10분마다 반복
    while True:
        now = datetime.datetime.now()
        # 다음 정각+10분 계산
        next_hour = (now + datetime.timedelta(hours=1)).replace(minute=10, second=0, microsecond=0)
        wait_sec = (next_hour - now).total_seconds()
        if wait_sec > 0:
            time.sleep(wait_sec)
        print(f'[크롤링] 정각+10분({next_hour.strftime("%H:%M")}) 데이터 수집 실행')
        crawl_once()

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        import os
        if os.environ.get('RUN_MAIN') != 'true':
            return
        # DB 초기화: 서버 시작 시 Manager, Player 테이블 전체 삭제
        from django.db import connection
        try:
            from core.models import Manager, Player
            Manager.objects.all().delete()
            Player.objects.all().delete()
            print('[DB] 서버 재시작으로 Manager, Player 테이블 전체 삭제 완료')
        except Exception as e:
            print(f'[DB] 초기화 실패: {e}')
        if not hasattr(self, '_scheduler_started'):
            self._scheduler_started = True
            def first_crawl_and_start_scheduler():
                import time
                from core.management.commands.crawl_managers import log_with_time
                time.sleep(1)
                log_with_time('[크롤링] 서버 시작시 최초 데이터 수집 실행')
                crawl_once()
                crawl_scheduler()
            t = threading.Thread(target=first_crawl_and_start_scheduler, daemon=True)
            t.start()
