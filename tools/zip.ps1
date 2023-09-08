# compress dist contents to zip and force write if ./zipped.zip already exists
Compress-Archive -Force -Path .\dist\* -DestinationPath .\dist.zip
# prints file size in KB
Write-Host((Get-Item .\dist.zip).length / 1KB)