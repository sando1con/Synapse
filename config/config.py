# config/config.py

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
RAW_DATA_DIR = os.path.join(DATA_DIR, 'raw')
PROCESSED_DATA_DIR = os.path.join(DATA_DIR, 'processed')
LOG_DIR = os.path.join(BASE_DIR, 'logs')

config = {
    "BASE_DIR": BASE_DIR,
    "DATA_DIR": DATA_DIR,
    "RAW_DATA_DIR": RAW_DATA_DIR,
    "PROCESSED_DATA_DIR": PROCESSED_DATA_DIR,
    "LOG_DIR": LOG_DIR
}

RETRAIN_THRESHOLD = 10
