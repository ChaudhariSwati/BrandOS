@echo off
REM Remove broken SMTP_FROM lines
powershell -Command "(Get-Content 'server\.env') | Where-Object {$_ -notlike 'SMTP_FROM*'} | Set-Content 'server\.env'"

REM Add proper SMTP_FROM
echo SMTP_FROM="BrandOS <swatidchaudhary17@gmail.com>" >> server\.env

echo Done fixing .env
