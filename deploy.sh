#!/bin/bash

# 프로젝트 디렉토리로 이동 (스크립트 위치 기준)
cd "$(dirname "$0")"

echo "------- 1. Pulling latest code from Git -------"
git pull origin main

echo "------- 2. Installing dependencies -------"
npm install

echo "------- 3. Building the application -------"
npm run build

echo "------- 4. Starting in background with PM2 -------"
# PM2가 설치되어 있는지 확인
if ! command -v pm2 &> /dev/null
then
    echo "PM2 could not be found. Installing PM2 globally..."
    sudo npm install -g pm2
fi

# 기존에 실행 중인 프로세스가 있다면 중지 및 삭제 (이름: infinite-stairs)
pm2 delete infinite-stairs 2>/dev/null || true

# 새로운 프로세스 실행
pm2 start npm --name "infinite-stairs" -- start

# 서버 재부팅 시 자동 실행 설정 (선택 사항)
# pm2 save

echo "------- Deployment Complete! -------"
echo "Check status with: pm2 status"
echo "Check logs with: pm2 logs infinite-stairs"
