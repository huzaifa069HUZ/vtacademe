Add-Type -AssemblyName System.Drawing

$srcPath = 'c:\Users\huzai\Desktop\vt academy\logo.jpeg'

# Load the original image
$srcImg = [System.Drawing.Image]::FromFile($srcPath)
$maxDim = [math]::Max($srcImg.Width, $srcImg.Height)

# Create a square bitmap with a 254, 254, 254 background
$squareBmp = New-Object System.Drawing.Bitmap($maxDim, $maxDim)
$squareG = [System.Drawing.Graphics]::FromImage($squareBmp)
$squareG.Clear([System.Drawing.Color]::FromArgb(255, 254, 254, 254))

$x = ($maxDim - $srcImg.Width) / 2
$y = ($maxDim - $srcImg.Height) / 2

# Draw original image onto square canvas
$squareG.DrawImage($srcImg, $x, $y, $srcImg.Width, $srcImg.Height)

# Define function to resize and save
function Save-Favicon($size, $filename) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($squareBmp, 0, 0, $size, $size)
    $path = "c:\Users\huzai\Desktop\vt academy\$filename"
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Saved $filename"
}

Save-Favicon 192 "favicon-192x192.png"
Save-Favicon 512 "favicon-512x512.png"
Save-Favicon 180 "apple-touch-icon.png"

$squareG.Dispose()
$squareBmp.Dispose()
$srcImg.Dispose()
