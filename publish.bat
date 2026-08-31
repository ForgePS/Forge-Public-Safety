@echo off
title Forge website publish (AWS CloudFront)
cd /d "%~dp0"
echo.
echo  Builds the site and deploys to S3 + CloudFront.
echo  Requires AWS CLI and env vars:
echo    AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
echo    AWS_S3_BUCKET, AWS_CLOUDFRONT_DISTRIBUTION_ID
echo.
set /p OK=Continue? (Y/N):
if /I not "%OK%"=="Y" exit /b 0

if "%AWS_S3_BUCKET%"=="" (
  echo AWS_S3_BUCKET is not set.
  pause
  exit /b 1
)
if "%AWS_CLOUDFRONT_DISTRIBUTION_ID%"=="" (
  echo AWS_CLOUDFRONT_DISTRIBUTION_ID is not set.
  pause
  exit /b 1
)

call npm run build
if errorlevel 1 (
  echo Build failed. Fix errors and try again.
  pause
  exit /b 1
)

aws s3 sync dist/ "s3://%AWS_S3_BUCKET%/" --delete
if errorlevel 1 (
  echo S3 sync failed.
  pause
  exit /b 1
)

aws s3 cp dist/index.html "s3://%AWS_S3_BUCKET%/index.html" --cache-control "public,max-age=0,must-revalidate" --content-type "text/html; charset=utf-8"
aws s3 sync dist/assets/ "s3://%AWS_S3_BUCKET%/assets/" --cache-control "public,max-age=31536000,immutable" 2>nul

aws cloudfront create-invalidation --distribution-id "%AWS_CLOUDFRONT_DISTRIBUTION_ID%" --paths "/*"
if errorlevel 1 (
  echo CloudFront invalidation failed.
  pause
  exit /b 1
)

echo.
echo Done. CloudFront will serve the new build after invalidation finishes.
pause
