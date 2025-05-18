from django.apps import AppConfig
import threading
import datetime
import time
from django.db.utils import OperationalError
from django.db import connection
from django.core.management import call_command

def should_crawl():
    from core.models import Manager
    try:
        # 데이터가 없으면 True
        return Manager.objects.count() == 0
    except OperationalError:
        # DB가 아직 준비되지 않은 경우
        return False

def crawl_once():
    max_retries = 3
    retry_delay = 300  # 5분

    for attempt in range(max_retries):
        try:
            call_command('crawl_managers')
            # 크롤링 성공 여부 확인
            from core.models import Manager, Player
            if Manager.objects.exists() and Player.objects.exists():
                print(f"[크롤링] {attempt + 1}번째 시도 성공")
                return True
            else:
                raise Exception("데이터가 정상적으로 저장되지 않음")
        except Exception as e:
            print(f"[크롤링] {attempt + 1}번째 시도 실패: {e}")
            if attempt < max_retries - 1:
                print(f"[크롤링] {retry_delay}초 후 재시도...")
                time.sleep(retry_delay)
            else:
                print("[크롤링] 최종 실패")
                return False

def crawl_scheduler():
    while True:
        try:
            now = datetime.datetime.now()
            # 다음 정각+10분 계산
            next_hour = (now + datetime.timedelta(hours=1)).replace(minute=10, second=0, microsecond=0)
            wait_sec = (next_hour - now).total_seconds()
            
            if wait_sec > 0:
                time.sleep(wait_sec)
            
            print(f'[크롤링] 정각+10분({next_hour.strftime("%H:%M")}) 데이터 수집 실행')
            
            # 크롤링 실행 및 성공할 때까지 재시도
            while not crawl_once():
                print("[크롤링] 5분 후 재시도...")
                time.sleep(300)
                
        except Exception as e:
            print(f"[크롤링] 스케줄러 오류: {e}")
            time.sleep(60)  # 1분 후 재시도

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        import os
        if os.environ.get('RUN_MAIN') != 'true':
            return

        if not hasattr(self, '_scheduler_started'):
            self._scheduler_started = True
            
            def initialize_db_and_start_scheduler():
                # DB가 준비될 때까지 대기
                max_retries = 5
                retry_count = 0
                while retry_count < max_retries:
                    try:
                        with connection.cursor() as cursor:
                            cursor.execute("SELECT 1")
                            break
                    except OperationalError:
                        retry_count += 1
                        time.sleep(1)
                
                if retry_count == max_retries:
                    print("[DB] 데이터베이스 연결 실패")
                    return

                # 메타데이터 로드
                try:
                    from core.tasks import load_meta  # 여기서 import
                    load_meta()
                    print('[메타데이터] 서버 시작시 메타데이터 로드 완료')
                except Exception as e:
                    print(f'[메타데이터] 로드 실패: {e}')

                # DB 초기화: 서버 시작 시 Manager, Player 테이블 전체 삭제
                try:
                    from core.models import Manager, Player
                    Manager.objects.all().delete()
                    Player.objects.all().delete()
                    print('[DB] 서버 재시작으로 Manager, Player 테이블 전체 삭제 완료')
                except Exception as e:
                    print(f'[DB] 초기화 실패: {e}')

                # 크롤링 스케줄러 시작
                time.sleep(1)
                from core.management.commands.crawl_managers import log_with_time
                log_with_time('[크롤링] 서버 시작시 최초 데이터 수집 실행')
                crawl_once()
                crawl_scheduler()

            t = threading.Thread(target=initialize_db_and_start_scheduler, daemon=True)
            t.start()
