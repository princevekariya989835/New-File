Add-Type -AssemblyName System.Drawing

Get-ChildItem "e:\Riotus WebSite\New-File\public\assets\collections\*.jpg" | ForEach-Object {
    $b = [System.Drawing.Bitmap]::FromFile($_.FullName)
    Write-Host "$($_.Name): $($b.Width)x$($b.Height), $($_.Length) bytes"
    $b.Dispose()
}
