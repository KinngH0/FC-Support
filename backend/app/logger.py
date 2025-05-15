import logging
import sys
from datetime import datetime
import pytz

# 서울 시간대 설정
seoul_tz = pytz.timezone('Asia/Seoul')

class SeoulTimeFormatter(logging.Formatter):
    def formatTime(self, record, datefmt=None):
        dt = datetime.fromtimestamp(record.created)
        dt = dt.astimezone(seoul_tz)
        if datefmt:
            return dt.strftime(datefmt)
        return dt.strftime('%Y-%m-%d %H:%M:%S')

def setup_logger():
    logger = logging.getLogger('fc_support')
    logger.setLevel(logging.INFO)
    
    # 기존 핸들러 제거
    logger.handlers = []
    
    # 루트 로거로부터의 전파 방지
    logger.propagate = False
    
    # 콘솔 핸들러
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    formatter = SeoulTimeFormatter('%(asctime)s [%(levelname)s] %(message)s')
    console_handler.setFormatter(formatter)
    
    # 파일 핸들러
    file_handler = logging.FileHandler('logs/fc_support.log', encoding='utf-8')
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    return logger

logger = setup_logger() 