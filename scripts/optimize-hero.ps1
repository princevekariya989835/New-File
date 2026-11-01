Add-Type -AssemblyName System.Drawing

$src = "e:\Riotus WebSite\New-File\public\assets\hero-model.jpg"
$img = [System.Drawing.Bitmap]::FromFile($src)
$newW = 640
$newH = 800
$resized = New-Object System.Drawing.Bitmap($newW, $newH)
$g = [System.Drawing.Graphics]::FromImage($resized)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($img, 0, 0, $newW, $newH)
$g.Dispose()

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]80)

$dest = "e:\Riotus WebSite\New-File\public\assets\hero-model-mobile.jpg"
$resized.Save($dest, $jpegCodec, $encoderParams)
$resized.Dispose()
$img.Dispose()

Write-Host "Generated hero-model-mobile.jpg:"
Get-Item $dest | Select-Object Name, Length
