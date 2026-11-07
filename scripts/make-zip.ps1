$destination = "D:\reunion-table-reservation-deploy.zip"
if (Test-Path $destination) {
    Remove-Item $destination -Force
}

$tempStaging = "D:\temp-staging-reunion"
if (Test-Path $tempStaging) {
    Remove-Item $tempStaging -Recurse -Force
}
New-Item -ItemType Directory -Path $tempStaging | Out-Null

# Copy everything except node_modules, .next, and temporary wal/shm files
robocopy "D:\reunion-table-reservation" $tempStaging /XD node_modules .next /XF *.db-wal *.db-shm *.log /E /NFL /NDL /NJH /NJS

# Compress the staging directory
Compress-Archive -Path "$tempStaging\*" -DestinationPath $destination -Force

# Clean up staging
Remove-Item $tempStaging -Recurse -Force

Write-Host "Created deploy zip successfully at $destination (" ([math]::Round((Get-Item $destination).Length / 1MB, 2)) "MB)"
