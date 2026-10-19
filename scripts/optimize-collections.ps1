Add-Type -AssemblyName System.Drawing

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)

Get-ChildItem "e:\Riotus WebSite\New-File\public\assets\collections\*.jpg" | ForEach-Object {
    $origPath = $_.FullName
    $img = [System.Drawing.Bitmap]::FromFile($origPath)
    $origBytes = $_.Length
    
    # Target 540 x 810 (perfect for 400x533 @ 1.35x DPR)
    $targetW = [int]($img.Width * 0.8)
    $targetH = [int]($img.Height * 0.8)
    
    $resized = New-Object System.Drawing.Bitmap($targetW, $targetH)
    $g = [System.Drawing.Graphics]::FromImage($resized)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $targetW, $targetH)
    $g.Dispose()
    $img.Dispose()
    
    # Save to temp then overwrite
    $tempPath = "$origPath.tmp"
    $resized.Save($tempPath, $jpegCodec, $encoderParams)
    $resized.Dispose()
    
    Move-Item -Force $tempPath $origPath
    $newBytes = (Get-Item $origPath).Length
    $saved = $origBytes - $newBytes
    $pct = [Math]::Round(($saved / $origBytes) * 100, 1)
    Write-Host "$($_.Name): $origBytes -> $newBytes bytes (saved $pct%)"
}
