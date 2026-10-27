param([string]$SevenZip = '7z')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$config = @{}
Get-Content -LiteralPath (Join-Path $taskRoot '.env.example') | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') { $config[$Matches[1]] = $Matches[2] }
}
$archiveUrl = $config['FFMPEG_ARCHIVE_URL']
if (-not $archiveUrl -or ([uri]$archiveUrl).Scheme -ne 'https') {
  throw 'FFMPEG_ARCHIVE_URL must be an HTTPS URL in .env.example'
}
$taskDownload = Join-Path $taskRoot 'vendor/downloads'
New-Item -ItemType Directory -Force -Path $taskDownload | Out-Null
$archive = Join-Path $taskDownload 'ffmpeg-7.0.2-full_build.7z'
Invoke-WebRequest -Uri $archiveUrl -OutFile $archive
& $SevenZip x $archive "-o$taskDownload" -y
if ($LASTEXITCODE -ne 0) { throw 'FFmpeg archive extraction failed' }
# Preparation checks repository-pinned hashes before executing the downloaded binary.
& node (Join-Path $PSScriptRoot 'prepare-media.js') (Join-Path $taskDownload 'ffmpeg-7.0.2-full_build')
if ($LASTEXITCODE -ne 0) { throw 'FFmpeg pinned-version preparation failed' }
