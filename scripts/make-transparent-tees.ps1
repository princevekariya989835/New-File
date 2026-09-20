Add-Type -AssemblyName System.Drawing

function Remove-Background-FloodFill($sourcePath, $destPath) {
    $img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $sourcePath))
    $w = $img.Width
    $h = $img.Height
    $out = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    # Boolean array to track visited background pixels
    $visited = New-Object 'bool[,]' $w, $h
    $queue = New-Object System.Collections.Generic.Queue[System.Drawing.Point]

    # Helper function to test if pixel is background (near white)
    function Is-Bg($px, $py) {
        $c = $img.GetPixel($px, $py)
        return ($c.R -ge 248 -and $c.G -ge 248 -and $c.B -ge 248)
    }

    # Seed all 4 borders
    for ($x = 0; $x -lt $w; $x++) {
        if (Is-Bg $x 0) { $visited[$x, 0] = $true; $queue.Enqueue((New-Object System.Drawing.Point($x, 0))) }
        if (Is-Bg $x ($h - 1)) { $visited[$x, $h - 1] = $true; $queue.Enqueue((New-Object System.Drawing.Point($x, $h - 1))) }
    }
    for ($y = 0; $y -lt $h; $y++) {
        if (Is-Bg 0 $y) { $visited[0, $y] = $true; $queue.Enqueue((New-Object System.Drawing.Point(0, $y))) }
        if (Is-Bg ($w - 1) $y) { $visited[$w - 1, $y] = $true; $queue.Enqueue((New-Object System.Drawing.Point($w - 1, $y))) }
    }

    # BFS flood fill
    $dx = @(1, -1, 0, 0)
    $dy = @(0, 0, 1, -1)
    while ($queue.Count -gt 0) {
        $pt = $queue.Dequeue()
        for ($i = 0; $i -lt 4; $i++) {
            $nx = $pt.X + $dx[$i]
            $ny = $pt.Y + $dy[$i]
            if ($nx -ge 0 -and $nx -lt $w -and $ny -ge 0 -and $ny -lt $h) {
                if (-not $visited[$nx, $ny] -and (Is-Bg $nx $ny)) {
                    $visited[$nx, $ny] = $true
                    $queue.Enqueue((New-Object System.Drawing.Point($nx, $ny)))
                }
            }
        }
    }

    # Draw to output
    for ($x = 0; $x -lt $w; $x++) {
        for ($y = 0; $y -lt $h; $y++) {
            if ($visited[$x, $y]) {
                $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            } else {
                $out.SetPixel($x, $y, $img.GetPixel($x, $y))
            }
        }
    }

    $out.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
    $img.Dispose()
    Write-Host "Flood-fill transparent completed: $destPath"
}

Remove-Background-FloodFill "public/products/zoro-black-2.jpg" "public/assets/tee-zoro-back-trans.png"
Remove-Background-FloodFill "public/products/zenitsu-maroon-2.jpg" "public/assets/tee-zenitsu-back-trans.png"
Remove-Background-FloodFill "public/products/zoro-olive-1.jpg" "public/assets/tee-olive-front-trans.png"
Remove-Background-FloodFill "public/products/zoro-black-1.jpg" "public/assets/tee-zoro-front-trans.png"
