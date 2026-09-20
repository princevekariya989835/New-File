Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class Featherer
{
    public static void FeatherLeft(string imgPath)
    {
        using (Bitmap b = new Bitmap(imgPath))
        {
            Rectangle rect = new Rectangle(0, 0, b.Width, b.Height);
            BitmapData data = b.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int bytes = Math.Abs(data.Stride) * b.Height;
            byte[] buffer = new byte[bytes];
            Marshal.Copy(data.Scan0, buffer, 0, bytes);

            int stride = data.Stride;
            int fadeWidth = 80;

            for (int y = 0; y < b.Height; y++)
            {
                int row = y * stride;
                for (int x = 0; x < fadeWidth; x++)
                {
                    int idx = row + (x * 4);
                    float factor = (float)x / (float)fadeWidth; // 0 at x=0, 1 at x=fadeWidth
                    // smoothly ease in
                    factor = factor * factor * (3f - 2f * factor);
                    
                    byte origA = buffer[idx + 3];
                    buffer[idx + 3] = (byte)(origA * factor);
                }
            }

            Marshal.Copy(buffer, 0, data.Scan0, bytes);
            b.UnlockBits(data);
            b.Save(imgPath + ".temp.png", ImageFormat.Png);
        }
        System.IO.File.Delete(imgPath);
        System.IO.File.Move(imgPath + ".temp.png", imgPath);
    }
}
"@ -ReferencedAssemblies "System.Drawing"

[Featherer]::FeatherLeft("D:\New-File\public\assets\riotous-tees-showcase.png")
Write-Host "Feathered left edge of tees showcase successfully!"
