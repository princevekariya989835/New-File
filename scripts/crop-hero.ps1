Add-Type -AssemblyName System.Drawing

$sourcePath = "d:\New-File\public\assets\riotous-desktop-hero-hd.png"
$img = [System.Drawing.Bitmap]::FromFile($sourcePath)

Write-Host "Image size: $($img.Width) x $($img.Height)"

$cropX = 1035
$cropWidth = $img.Width - $cropX
$cropHeight = $img.Height

$cropRect = New-Object System.Drawing.Rectangle($cropX, 0, $cropWidth, $cropHeight)
$cropped = New-Object System.Drawing.Bitmap($cropWidth, $cropHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($cropped)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($img, [System.Drawing.Rectangle]::new(0, 0, $cropWidth, $cropHeight), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

# Feather the left 90 pixels with genuine alpha transparency
for ($x = 0; $x -lt 90; $x++) {
    $alpha = [Math]::Pow($x / 90.0, 1.4)
    for ($y = 0; $y -lt $cropHeight; $y++) {
        $p = $cropped.GetPixel($x, $y)
        $newA = [Math]::Max(0, [Math]::Min(255, [int]($p.A * $alpha)))
        $cropped.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($newA, $p.R, $p.G, $p.B))
    }
}

$destPath = "d:\New-File\public\assets\riotous-hero-graphic-clean.png"
$cropped.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Also create high quality JPEG version
$jpgBitmap = New-Object System.Drawing.Bitmap($cropWidth, $cropHeight)
$jg = [System.Drawing.Graphics]::FromImage($jpgBitmap)
$jg.Clear([System.Drawing.Color]::White)
$jg.DrawImage($cropped, 0, 0)
$jg.Dispose()

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]90)

$jpgPath = "d:\New-File\public\assets\riotous-hero-graphic-clean.jpg"
$jpgBitmap.Save($jpgPath, $jpegCodec, $encoderParams)
$jpgBitmap.Dispose()
$cropped.Dispose()
$img.Dispose()

Write-Host "Clean hero graphics saved: PNG & JPG"
