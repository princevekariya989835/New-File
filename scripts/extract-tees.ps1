Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class TeesExtractor
{
    public static void Extract(string srcPath, string outPath)
    {
        using (Bitmap orig = new Bitmap(srcPath))
        {
            // The tees and graffiti start around X=315, Y=52, width=(1024-315)=709, height=(492-52)=440
            int cropX = 315;
            int cropY = 52;
            int cropW = orig.Width - cropX;
            int cropH = orig.Height - cropY;

            Rectangle cropRect = new Rectangle(cropX, cropY, cropW, cropH);
            using (Bitmap crop = orig.Clone(cropRect, PixelFormat.Format32bppArgb))
            {
                // High-DPI upscale 2.5x to ~1772 x 1100
                int targetW = (int)(cropW * 2.5);
                int targetH = (int)(cropH * 2.5);

                using (Bitmap scaled = new Bitmap(targetW, targetH, PixelFormat.Format32bppArgb))
                {
                    using (Graphics g = Graphics.FromImage(scaled))
                    {
                        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g.SmoothingMode = SmoothingMode.HighQuality;
                        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        g.CompositingQuality = CompositingQuality.HighQuality;
                        g.DrawImage(crop, 0, 0, targetW, targetH);
                    }

                    // Fast C# Unsharp Mask to sharpen t-shirt graphics, cranes, and Luffy
                    using (Bitmap sharp = new Bitmap(targetW, targetH, PixelFormat.Format32bppArgb))
                    {
                        Rectangle rect = new Rectangle(0, 0, targetW, targetH);
                        BitmapData srcData = scaled.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                        BitmapData dstData = sharp.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);

                        int bytesCount = Math.Abs(srcData.Stride) * targetH;
                        byte[] srcBytes = new byte[bytesCount];
                        byte[] dstBytes = new byte[bytesCount];

                        Marshal.Copy(srcData.Scan0, srcBytes, 0, bytesCount);

                        int stride = srcData.Stride;
                        for (int y = 1; y < targetH - 1; y++)
                        {
                            int rowIdx = y * stride;
                            int prevRow = (y - 1) * stride;
                            int nextRow = (y + 1) * stride;
                            for (int x = 1; x < targetW - 1; x++)
                            {
                                int idx = rowIdx + (x * 4);
                                for (int c = 0; c < 3; c++)
                                {
                                    int val = srcBytes[idx + c];
                                    int up = srcBytes[prevRow + (x * 4) + c];
                                    int down = srcBytes[nextRow + (x * 4) + c];
                                    int left = srcBytes[rowIdx + ((x - 1) * 4) + c];
                                    int right = srcBytes[rowIdx + ((x + 1) * 4) + c];

                                    double avg = (up + down + left + right) * 0.25;
                                    double diff = val - avg;
                                    int res = (int)(val + 0.60 * diff);

                                    if (res > 255) res = 255;
                                    else if (res < 0) res = 0;

                                    dstBytes[idx + c] = (byte)res;
                                }
                                dstBytes[idx + 3] = 255;
                            }
                        }

                        Marshal.Copy(dstBytes, 0, dstData.Scan0, bytesCount);
                        scaled.UnlockBits(srcData);
                        sharp.UnlockBits(dstData);

                        sharp.Save(outPath, ImageFormat.Png);
                    }
                }
            }
        }
    }
}
"@ -ReferencedAssemblies "System.Drawing"

$src = "C:\Users\C-TECH\.gemini\antigravity-ide\brain\a6e47d06-bbc0-4167-8c61-24fe2b443625\.user_uploaded\media_1789889908842.jpg"
$outPng = "D:\New-File\public\assets\riotous-tees-showcase.png"
[TeesExtractor]::Extract($src, $outPng)
Write-Host "Extracted tees showcase to: $outPng"
